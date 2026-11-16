import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
const file = path.join(directory, 'database.json');
let writeQueue = Promise.resolve();

export async function readDatabase() {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { users: [], meals: [] };
  }
}

export function updateDatabase(update) {
  const operation = writeQueue.then(async () => {
    const database = await readDatabase();
    const result = await update(database);
    await mkdir(directory, { recursive: true });
    const temporaryFile = `${file}.tmp`;
    await writeFile(temporaryFile, JSON.stringify(database, null, 2), 'utf8');
    await rename(temporaryFile, file);
    return result;
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}
