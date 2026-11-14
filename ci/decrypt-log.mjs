#!/usr/bin/env node
// Decrypt a log published by ci/encrypt-log.mjs.
//
//   node ci/decrypt-log.mjs gate.log.enc ~/.taste-gate/gate-log-key.pem gate.log
//
// Prints the plaintext to stdout when no output path is given, so it can be
// piped: node ci/decrypt-log.mjs gate.log.enc KEY | grep '^GATE:'
import { readFileSync, writeFileSync } from "node:fs";
import {
  constants, createDecipheriv, privateDecrypt,
} from "node:crypto";

const [, , inPath, keyPath, outPath] = process.argv;
if (!inPath || !keyPath) {
  console.error("usage: decrypt-log.mjs <encrypted.json> <private-key.pem> [output]");
  process.exit(2);
}

const envelope = JSON.parse(readFileSync(inPath, "utf8"));
if (envelope.v !== 1) throw new Error(`unsupported envelope version ${envelope.v}`);

const priv = readFileSync(keyPath, "utf8");
const key = privateDecrypt(
  { key: priv, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
  Buffer.from(envelope.ek, "base64"),
);

const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
const plain = Buffer.concat([
  decipher.update(Buffer.from(envelope.ct, "base64")),
  decipher.final(),
]);

if (outPath) writeFileSync(outPath, plain);
else process.stdout.write(plain);
