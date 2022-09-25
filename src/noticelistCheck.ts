import { iteratorType, noticeList, userData } from './database';

const noticelistCheck = async () => {
    for await (const [, user] of userData.iterator() as iteratorType<typeof userData>) {
        for (const song of user.registeredList.songs) {
            const targets = await noticeList.get(song.video_id) ?? [];
            if (targets.includes(user.userId)) continue;
            await noticeList.set(song.video_id, targets.concat(user.userId));
        }
    }
};

export default noticelistCheck;
