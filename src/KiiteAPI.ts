import request from 'request';

export async function getAPI (url: string, queryParam: object = {}) {
    console.log('APIを呼び出しました');
    const { response, body } = await new Promise(resolve =>
        request(
            { url: url, qs: queryParam, json: true },
            (error, response, body) => {
                resolve(Object.assign({}, { error: error, response: response, body: body }));
            }
        )
    );

    if (response.statusCode === 200) {
        return body;
    } else {
        console.log('APIの読み込みに失敗しました');
        return null;
    }
}
