function getEnvVariable (envName: string, required: true): string;
function getEnvVariable (envName: string, required: false): string | undefined;
function getEnvVariable (envName: string, required: boolean): string | undefined {
    const envValue = process.env[envName];
    if (required && envValue === undefined) {
        throw new Error(`環境変数 ${envName} が定義されていません。`);
    }
    return envValue;
}

export const TOKEN = getEnvVariable('TOKEN', true);
export const API_ENDPOINT = getEnvVariable('API_ENDPOINT', true);
export const TEST_SERVER_ID = getEnvVariable('TEST_SERVER_ID', false);
