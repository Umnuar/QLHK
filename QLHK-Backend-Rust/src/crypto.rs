use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use hmac::{Hmac, Mac};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::env;
use unicode_normalization::UnicodeNormalization;

pub const DEFAULT_ENCRYPTION_KEY: &str =
    "9e0ec6d63e2a75256378ea59833c454c63681150dd0a02bc6a608c195a66ff57";
pub const DEFAULT_CCCD_HASH_PEPPER: &str =
    "qlhk-dakha-cccd-pepper-secret-2026-v2-production-key";

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EncryptedCCCD {
    pub encrypted: String,
    pub hash: String,
    pub last4: String,
}

pub fn derive_key(raw_key: &str) -> [u8; 32] {
    let raw_trimmed = raw_key.trim();
    let key_to_use = if raw_trimmed.is_empty() {
        env::var("ENCRYPTION_KEY")
            .unwrap_or_else(|_| DEFAULT_ENCRYPTION_KEY.to_string())
    } else {
        raw_trimmed.to_string()
    };
    let key_to_use = key_to_use.trim();

    if key_to_use.len() == 64 && key_to_use.chars().all(|c| c.is_ascii_hexdigit()) {
        if let Ok(bytes) = hex::decode(key_to_use) {
            if bytes.len() == 32 {
                let mut key = [0u8; 32];
                key.copy_from_slice(&bytes);
                return key;
            }
        }
    }

    let mut hasher = Sha256::new();
    hasher.update(key_to_use.as_bytes());
    let mut key = [0u8; 32];
    key.copy_from_slice(&hasher.finalize());
    key
}

pub fn hash_cccd_with_pepper(plain: &str, pepper: &str) -> String {
    let cleaned = plain.trim();
    if cleaned.is_empty() {
        return String::new();
    }
    let pepper_str = if pepper.trim().is_empty() {
        env::var("CCCD_HASH_PEPPER")
            .unwrap_or_else(|_| DEFAULT_CCCD_HASH_PEPPER.to_string())
    } else {
        pepper.to_string()
    };

    let Ok(mut mac) = <HmacSha256 as Mac>::new_from_slice(pepper_str.trim().as_bytes()) else {
        return String::new();
    };
    mac.update(cleaned.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

pub fn hash_cccd(plain: &str) -> String {
    hash_cccd_with_pepper(plain, "")
}

pub fn constant_time_eq_bytes(a: &[u8], b: &[u8]) -> bool {
    let mut diff = a.len() ^ b.len();
    let max_len = a.len().max(b.len());
    for i in 0..max_len {
        let x = a.get(i).copied().unwrap_or(0);
        let y = b.get(i).copied().unwrap_or(0);
        diff |= core::hint::black_box((x ^ y) as usize);
    }
    core::hint::black_box(diff) == 0
}

pub fn constant_time_compare(a: &str, b: &str) -> bool {
    constant_time_eq_bytes(a.as_bytes(), b.as_bytes())
}

pub fn verify_cccd_hash_with_pepper(plain: &str, expected_hash_hex: &str, pepper: &str) -> bool {
    let cleaned = plain.trim();
    let expected_trimmed = expected_hash_hex.trim();
    if cleaned.is_empty() || expected_trimmed.is_empty() {
        return false;
    }
    let Ok(expected_bytes) = hex::decode(expected_trimmed) else {
        return false;
    };
    let pepper_str = if pepper.trim().is_empty() {
        env::var("CCCD_HASH_PEPPER")
            .unwrap_or_else(|_| DEFAULT_CCCD_HASH_PEPPER.to_string())
    } else {
        pepper.to_string()
    };

    let Ok(mut mac) = <HmacSha256 as Mac>::new_from_slice(pepper_str.trim().as_bytes()) else {
        return false;
    };
    mac.update(cleaned.as_bytes());
    mac.verify_slice(&expected_bytes).is_ok()
}

pub fn verify_cccd_hash(plain: &str, expected_hash: &str) -> bool {
    verify_cccd_hash_with_pepper(plain, expected_hash, "")
}

pub fn remove_accents(s: &str) -> String {
    let trimmed = s.trim();
    let mut result = String::with_capacity(trimmed.len());
    for c in trimmed
        .chars()
        .flat_map(|c| match c {
            'đ' | 'Đ' => 'd'.to_lowercase(),
            other => other.to_lowercase(),
        })
        .nfd()
    {
        if !('\u{0300}'..='\u{036f}').contains(&c) {
            result.push(c);
        }
    }
    result
}

pub fn encrypt_cccd_with_key_and_pepper(
    plain_cccd: &str,
    key: &str,
    pepper: &str,
) -> Result<EncryptedCCCD, String> {
    let cleaned = plain_cccd.trim();
    if cleaned.is_empty() {
        return Ok(EncryptedCCCD {
            encrypted: String::new(),
            hash: String::new(),
            last4: String::new(),
        });
    }

    let mut iv = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut iv);
    encrypt_cccd_with_iv(cleaned, key, pepper, iv)
}

pub fn encrypt_cccd(plain_cccd: &str) -> Result<EncryptedCCCD, String> {
    encrypt_cccd_with_key_and_pepper(plain_cccd, "", "")
}

pub fn encrypt_cccd_with_iv(
    plain_cccd: &str,
    key: &str,
    pepper: &str,
    iv: [u8; 12],
) -> Result<EncryptedCCCD, String> {
    let cleaned = plain_cccd.trim();
    if cleaned.is_empty() {
        return Ok(EncryptedCCCD {
            encrypted: String::new(),
            hash: String::new(),
            last4: String::new(),
        });
    }

    let key_bytes = derive_key(key);
    let cipher = <Aes256Gcm as KeyInit>::new_from_slice(&key_bytes)
        .map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&iv);

    let ciphertext_with_tag = cipher
        .encrypt(nonce, cleaned.as_bytes())
        .map_err(|e| e.to_string())?;

    if ciphertext_with_tag.len() < 16 {
        return Err("Ciphertext too short for auth tag".to_string());
    }

    let split_pos = ciphertext_with_tag.len() - 16;
    let (ciphertext_bytes, tag_bytes) = ciphertext_with_tag.split_at(split_pos);

    let iv_hex = hex::encode(iv);
    let tag_hex = hex::encode(tag_bytes);
    let ciphertext_hex = hex::encode(ciphertext_bytes);

    let encrypted_string = format!("{}:{}:{}", iv_hex, tag_hex, ciphertext_hex);
    let hash = hash_cccd_with_pepper(cleaned, pepper);
    let char_count = cleaned.chars().count();
    let last4: String = if char_count >= 4 {
        cleaned.chars().skip(char_count - 4).collect()
    } else {
        cleaned.to_string()
    };

    Ok(EncryptedCCCD {
        encrypted: encrypted_string,
        hash,
        last4,
    })
}

pub fn decrypt_cccd_with_key(encrypted_string: &str, key: &str) -> Result<String, String> {
    let trimmed = encrypted_string.trim();
    if trimmed.is_empty() || !trimmed.contains(':') {
        return Ok(trimmed.to_string());
    }

    let mut parts = trimmed.split(':');
    let (Some(part_iv), Some(part_tag), Some(part_cipher), None) =
        (parts.next(), parts.next(), parts.next(), parts.next())
    else {
        return Err(
            "Định dạng chuỗi mã hóa không hợp lệ (cần iv:authTag:encryptedHex)".to_string(),
        );
    };

    let iv_trimmed = part_iv.trim();
    let mut iv_bytes = [0u8; 12];
    if iv_trimmed.len() != 24 {
        if let Err(e) = hex::decode(iv_trimmed) {
            return Err(e.to_string());
        }
        return Err("IV must be 12 bytes".to_string());
    }
    hex::decode_to_slice(iv_trimmed, &mut iv_bytes).map_err(|e| e.to_string())?;

    let tag_trimmed = part_tag.trim();
    let mut tag_bytes = [0u8; 16];
    if tag_trimmed.len() != 32 {
        if let Err(e) = hex::decode(tag_trimmed) {
            return Err(e.to_string());
        }
        return Err("Auth tag must be 16 bytes".to_string());
    }
    hex::decode_to_slice(tag_trimmed, &mut tag_bytes).map_err(|e| e.to_string())?;

    let cipher_trimmed = part_cipher.trim();
    let cipher_len = cipher_trimmed.len() / 2;
    let mut combined = vec![0u8; cipher_len + 16];
    hex::decode_to_slice(cipher_trimmed, &mut combined[..cipher_len])
        .map_err(|e| e.to_string())?;
    combined[cipher_len..].copy_from_slice(&tag_bytes);

    let key_bytes = derive_key(key);
    let cipher = <Aes256Gcm as KeyInit>::new_from_slice(&key_bytes)
        .map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&iv_bytes);

    let decrypted_bytes = cipher
        .decrypt(nonce, combined.as_ref())
        .map_err(|e| e.to_string())?;

    String::from_utf8(decrypted_bytes).map_err(|e| e.to_string())
}

pub fn decrypt_cccd(encrypted_string: &str) -> Result<String, String> {
    decrypt_cccd_with_key(encrypted_string, "")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_and_decrypt_roundtrip() {
        let plain = "064095000123";
        let encrypted_obj = encrypt_cccd(plain).unwrap();
        assert_eq!(encrypted_obj.last4, "0123");
        assert!(!encrypted_obj.encrypted.is_empty());
        assert!(!encrypted_obj.hash.is_empty());

        let decrypted = decrypt_cccd(&encrypted_obj.encrypted).unwrap();
        assert_eq!(decrypted, plain);
    }

    #[test]
    fn test_decrypt_known_node_ciphertext() {
        let known_node_encrypted =
            "0102030405060708090a0b0c:26540c874b4d3479541ca6c98cbb4efd:2e193e78eaac155269f88e2d";
        let decrypted = decrypt_cccd(known_node_encrypted).unwrap();
        assert_eq!(decrypted, "064095000123");
    }

    #[test]
    fn test_encrypt_with_iv_matches_node_ciphertext() {
        let plain = "064095000123";
        let iv = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        let encrypted_obj = encrypt_cccd_with_iv(
            plain,
            DEFAULT_ENCRYPTION_KEY,
            DEFAULT_CCCD_HASH_PEPPER,
            iv,
        )
        .unwrap();
        assert_eq!(
            encrypted_obj.encrypted,
            "0102030405060708090a0b0c:26540c874b4d3479541ca6c98cbb4efd:2e193e78eaac155269f88e2d"
        );
        assert_eq!(
            encrypted_obj.hash,
            "ff0fea6de77f041854027b5390b5f41eb1a2fecfff13586345749181e64c7e4a"
        );
    }

    #[test]
    fn test_hash_cccd_matches_node() {
        let plain = "064095000123";
        let hash = hash_cccd(plain);
        assert_eq!(
            hash,
            "ff0fea6de77f041854027b5390b5f41eb1a2fecfff13586345749181e64c7e4a"
        );
    }

    #[test]
    fn test_remove_accents_vietnamese_strings() {
        assert_eq!(remove_accents("Đinh Văn Điệp"), "dinh van diep");
        assert_eq!(remove_accents("Nguyễn Thị Lài"), "nguyen thi lai");
        assert_eq!(remove_accents("Y Blui"), "y blui");
        assert_eq!(remove_accents(""), "");
        assert_eq!(remove_accents("   TRẦN ĐỨC LƯƠNG   "), "tran duc luong");
    }

    #[test]
    fn test_decrypt_unencrypted_fallback() {
        let plain = "064095000123";
        let result = decrypt_cccd(plain).unwrap();
        assert_eq!(result, plain);
    }

    #[test]
    fn test_decrypt_invalid_format() {
        let invalid = "part1:part2";
        let result = decrypt_cccd(invalid);
        assert!(result.is_err());
    }

    #[test]
    fn test_key_derivation_non_hex() {
        let raw = "my-custom-passphrase";
        let key1 = derive_key(raw);
        let key2 = derive_key(raw);
        assert_eq!(key1, key2);
        assert_eq!(key1.len(), 32);
    }

    #[test]
    fn test_constant_time_compare() {
        assert!(constant_time_compare("hello", "hello"));
        assert!(!constant_time_compare("hello", "world"));
        assert!(!constant_time_compare("hello", "hell"));
        assert!(!constant_time_compare("", "a"));
        assert!(constant_time_compare("", ""));
    }

    #[test]
    fn test_constant_time_eq_bytes() {
        assert!(constant_time_eq_bytes(b"abcdef", b"abcdef"));
        assert!(!constant_time_eq_bytes(b"abcdef", b"abcdeg"));
        assert!(!constant_time_eq_bytes(b"abcdef", b"abcde"));
        assert!(!constant_time_eq_bytes(b"abcde", b"abcdef"));
        assert!(!constant_time_eq_bytes(b"", b"a"));
        assert!(!constant_time_eq_bytes(b"a", b""));
        assert!(constant_time_eq_bytes(b"", b""));
        assert!(!constant_time_eq_bytes(b"token\0", b"token"));
        assert!(!constant_time_eq_bytes(b"token", b"token\0"));
    }

    #[test]
    fn test_verify_cccd_hash() {
        let plain = "064095000123";
        let expected = "ff0fea6de77f041854027b5390b5f41eb1a2fecfff13586345749181e64c7e4a";
        assert!(verify_cccd_hash(plain, expected));
        assert!(!verify_cccd_hash(plain, "0000000000000000000000000000000000000000000000000000000000000000"));
        assert!(!verify_cccd_hash("", expected));
        assert!(!verify_cccd_hash(plain, ""));
    }

    #[test]
    fn test_decrypt_tampered_ciphertext_fails() {
        let tampered =
            "0102030405060708090a0b0c:26540c874b4d3479541ca6c98cbb4efd:2e193e78eaac155269f88e2e";
        let result = decrypt_cccd(tampered);
        assert!(result.is_err());
    }

    #[test]
    fn test_decrypt_invalid_tag_fails() {
        let invalid_tag =
            "0102030405060708090a0b0c:00000000000000000000000000000000:2e193e78eaac155269f88e2d";
        let result = decrypt_cccd(invalid_tag);
        assert!(result.is_err());
    }

    #[test]
    fn test_empty_plain_encrypt() {
        let empty_result = encrypt_cccd("   ").unwrap();
        assert_eq!(empty_result.encrypted, "");
        assert_eq!(empty_result.hash, "");
        assert_eq!(empty_result.last4, "");
    }
}
