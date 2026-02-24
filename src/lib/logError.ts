import { platformDb as prisma } from './db/platform';

export async function logError({
    workspaceId,
    userId,
    path,
    message,
    stack
}: {
    workspaceId?: string;
    userId?: string;
    path?: string;
    message: string;
    stack?: string;
}) {
    try {
        await prisma.errorLog.create({
            data: {
                workspaceId,
                userId,
                path,
                message,
                stack
            }
        });
    } catch (dbError) {
        console.error('[ErrorLogger] Failed to log error to DB:', dbError);
        console.error('[OriginalError]', message, stack);
    }
}
