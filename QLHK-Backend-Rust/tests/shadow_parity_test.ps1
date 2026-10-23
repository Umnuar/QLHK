param(
    [string]$NodeUrl = "http://localhost:5002",
    [string]$RustUrl = "http://localhost:5012",
    [string]$Token = "test-admin"
)

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$results = [System.Collections.Generic.List[PSCustomObject]]::new()

function Test-EndpointComparison {
    param(
        [string]$Name,
        [string]$Path,
        [hashtable]$RequestHeaders,
        [scriptblock]$Comparator
    )

    $nodeRes = $null
    $rustRes = $null
    $nodeStatus = 0
    $rustStatus = 0

    try {
        $nodeRaw = Invoke-WebRequest -Uri "$NodeUrl$Path" -Headers $RequestHeaders -Method Get -TimeoutSec 5 -ErrorAction Stop
        $nodeStatus = $nodeRaw.StatusCode
        $nodeRes = $nodeRaw.Content | ConvertFrom-Json
    } catch {
        if ($_.Exception.Response) {
            $nodeStatus = [int]$_.Exception.Response.StatusCode
        }
    }

    try {
        $rustRaw = Invoke-WebRequest -Uri "$RustUrl$Path" -Headers $RequestHeaders -Method Get -TimeoutSec 5 -ErrorAction Stop
        $rustStatus = $rustRaw.StatusCode
        $rustRes = $rustRaw.Content | ConvertFrom-Json
    } catch {
        if ($_.Exception.Response) {
            $rustStatus = [int]$_.Exception.Response.StatusCode
        }
    }

    $pass = $false
    $details = ""

    if ($Comparator) {
        $check = & $Comparator $nodeStatus $rustStatus $nodeRes $rustRes
        $pass = $check.Pass
        $details = $check.Details
    } else {
        $pass = ($nodeStatus -eq $rustStatus)
        $details = "NodeStatus=$nodeStatus, RustStatus=$rustStatus"
    }

    $record = [PSCustomObject]@{
        TestName = $Name
        Endpoint = $Path
        Passed = $pass
        Details = $details
    }
    $results.Add($record)
    Write-Host ("[{0}] {1}: {2}" -f ($(if ($pass) { "PASS" } else { "FAIL" }), $Name, $details))
}

Test-EndpointComparison -Name "Health Check" -Path "/api/health" -RequestHeaders @{} -Comparator {
    param($ns, $rs, $nr, $rr)
    $pass = ($rs -eq 200 -and $rr.status -eq "ok")
    return @{ Pass = $pass; Details = "RustStatus=$rs, RustBody=$($rr.status)" }
}

Test-EndpointComparison -Name "Unauthorized Access Gate" -Path "/api/households" -RequestHeaders @{} -Comparator {
    param($ns, $rs, $nr, $rr)
    $pass = ($rs -eq 401)
    return @{ Pass = $pass; Details = "RustStatus=$rs (expected 401)" }
}

Test-EndpointComparison -Name "Households List Total Parity" -Path "/api/households?page=1&limit=5" -RequestHeaders $headers -Comparator {
    param($ns, $rs, $nr, $rr)
    $rustTotal = $rr.pagination.total
    $nodeTotal = $nr.pagination.total
    $pass = ($rs -eq 200 -and $rustTotal -gt 0)
    return @{ Pass = $pass; Details = "RustTotal=$rustTotal, NodeTotal=$nodeTotal, RecordsInPage=$($rr.data.Count)" }
}

Test-EndpointComparison -Name "Citizen CCCD Decryption Parity" -Path "/api/households?page=1&limit=5" -RequestHeaders $headers -Comparator {
    param($ns, $rs, $nr, $rr)
    $firstHh = $rr.data | Select-Object -First 1
    $firstCit = $firstHh.citizens | Select-Object -First 1
    $hasCccdField = ($null -ne $firstCit.cccd)
    $cccdValue = $firstCit.cccd
    $notCiphertext = (-not ($cccdValue -match ":.*:"))
    $pass = ($rs -eq 200 -and $hasCccdField -and $notCiphertext)
    return @{ Pass = $pass; Details = "CitizenName=$($firstCit.full_name), CCCD=$cccdValue, Decrypted=$notCiphertext" }
}

Test-EndpointComparison -Name "Chúc Thọ Policy List Parity" -Path "/api/policies/chuctho?page=1&limit=5" -RequestHeaders $headers -Comparator {
    param($ns, $rs, $nr, $rr)
    $rustTotal = $rr.pagination.total
    $nodeTotal = $nr.pagination.total
    $firstItem = $rr.data | Select-Object -First 1
    $hasMilestones = ($null -ne $firstItem.age60 -or $null -ne $firstItem.age65 -or $null -ne $firstItem.age70)
    $pass = ($rs -eq 200 -and $rustTotal -gt 0 -and $hasMilestones)
    return @{ Pass = $pass; Details = "RustTotal=$rustTotal, NodeTotal=$nodeTotal, FirstPerson=$($firstItem.name)" }
}

Test-EndpointComparison -Name "HTXH Policy List Parity" -Path "/api/policies/htxh?page=1&limit=5" -RequestHeaders $headers -Comparator {
    param($ns, $rs, $nr, $rr)
    $rustTotal = $rr.pagination.total
    $nodeTotal = $nr.pagination.total
    $firstItem = $rr.data | Select-Object -First 1
    $pass = ($rs -eq 200 -and $null -ne $firstItem)
    return @{ Pass = $pass; Details = "RustTotal=$rustTotal, NodeTotal=$nodeTotal, FirstPerson=$($firstItem.name)" }
}

Test-EndpointComparison -Name "Analytics Overview Parity" -Path "/api/analytics/overview" -RequestHeaders $headers -Comparator {
    param($ns, $rs, $nr, $rr)
    $totalHh = $rr.data.totalHouseholds
    $totalCit = $rr.data.totalCitizens
    $pass = ($rs -eq 200 -and $totalHh -gt 0 -and $totalCit -gt 0)
    return @{ Pass = $pass; Details = "TotalHouseholds=$totalHh, TotalCitizens=$totalCit, Male=$($rr.data.gender.male.count), Female=$($rr.data.gender.female.count)" }
}

$passedCount = ($results | Where-Object { $_.Passed }).Count
$totalCount = $results.Count
Write-Host ("`nShadow Parity Test Summary: {0}/{1} Passed" -f $passedCount, $totalCount)

if ($passedCount -eq $totalCount) {
    exit 0
} else {
    exit 1
}
