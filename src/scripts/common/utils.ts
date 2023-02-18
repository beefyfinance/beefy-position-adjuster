import fs, { promises as fsPromises } from 'fs';

export async function fileExists(path: string) {
  return new Promise<boolean>(resolve => {
    fs.access(path, fs.constants.F_OK, err => {
      resolve(!err);
    });
  });
}

export async function loadJson<ReturnType = any>(path: string): Promise<ReturnType> {
  const json = await fsPromises.readFile(path, 'utf-8');
  return JSON.parse(json);
}
