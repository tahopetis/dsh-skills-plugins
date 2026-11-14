#!/usr/bin/env node
// Encrypt a gate log for publication on a public branch.
//
//   node ci/encrypt-log.mjs gate.log ci/gate-log-pub.pem gate.log.enc
//
// Hybrid encryption: a random AES-256-GCM key encrypts the log; the key is
// wrapped with RSA-OAEP-SHA256 using the committed public key. Only the owner
// of ci/../.taste-gate/gate-log-key.pem (kept off-repo) can read it.
// Dependency-free (node:crypto), so it runs on the Actions runner and on the
// phone identically.
import { readFileSync, writeFileSync } from "node:fs";
import {
  createCipheriv, constants, publicEncrypt, randomBytes,
} from "node:crypto";

const [, , inPath, pubPath, outPath] = process.argv;
if (!inPath || !pubPath || !outPath) {
  console.error("usage: encrypt-log.mjs <input> <public-key.pem> <output>");
  process.exit(2);
}

const plain = readFileSync(inPath);
const pub = readFileSync(pubPath, "utf8");

const key = randomBytes(32);
const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", key, iv);
const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
const tag = cipher.getAuthTag();
const wrapped = publicEncrypt(
  { key: pub, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
  key,
);

writeFileSync(outPath, JSON.stringify({
  v: 1,
  alg: "RSA-OAEP-SHA256+AES-256-GCM",
  ek: wrapped.toString("base64"),
  iv: iv.toString("base64"),
  tag: tag.toString("base64"),
  ct: ciphertext.toString("base64"),
}));
console.error(`encrypted ${plain.length} bytes -> ${outPath}`);
