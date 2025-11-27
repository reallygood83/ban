/**
 * 학생 개인정보 암호화/복호화 유틸리티
 * AES-GCM 방식 사용 (Web Crypto API)
 */

// 암호화 키 생성 (사용자별 고유)
async function generateKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(userId + 'student-data-encryption-key-2025'),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('ban-assignment-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 학생 이름 암호화
 */
export async function encryptStudentName(name: string, userId: string): Promise<string> {
  try {
    const key = await generateKey(userId);
    const encoder = new TextEncoder();
    const data = encoder.encode(name);

    // 초기화 벡터 생성
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 암호화
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // IV와 암호화된 데이터를 함께 Base64로 인코딩
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('암호화 실패:', error);
    throw new Error('학생 이름 암호화에 실패했습니다.');
  }
}

/**
 * 학생 이름 복호화
 */
export async function decryptStudentName(encryptedName: string, userId: string): Promise<string> {
  try {
    const key = await generateKey(userId);

    // Base64 디코딩
    const combined = Uint8Array.from(atob(encryptedName), c => c.charCodeAt(0));

    // IV와 암호화된 데이터 분리
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // 복호화
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('복호화 실패:', error);
    throw new Error('학생 이름 복호화에 실패했습니다.');
  }
}

/**
 * 학생 번호 마스킹 (예: 20250123 → 2025****23)
 */
export function maskStudentNumber(studentNumber: string): string {
  if (!studentNumber || studentNumber.length < 6) {
    return '****';
  }

  const start = studentNumber.slice(0, 4);
  const end = studentNumber.slice(-2);
  const masked = '*'.repeat(studentNumber.length - 6);

  return `${start}${masked}${end}`;
}

/**
 * 표시용 이름 생성 (예: 김철수 → 김*수)
 */
export function maskName(name: string): string {
  if (!name || name.length < 2) {
    return '*';
  }

  if (name.length === 2) {
    return `${name[0]}*`;
  }

  const first = name[0];
  const last = name[name.length - 1];
  const masked = '*'.repeat(name.length - 2);

  return `${first}${masked}${last}`;
}
