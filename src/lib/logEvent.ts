import { platformDb as prisma } from './db/platform';

export async function logEvent({
    workspaceId,
    actorUserId,
    type,
    payload
}: {
    workspaceId?: string;
    actorUserId?: string;
    type: string;
    payload?: Record<string, unknown>;
}) {
    try {
        await prisma.eventLog.create({
            data: {
                workspaceId,
                actorUserId,
                type,
                payloadJson: payload ? JSON.parse(JSON.stringify(payload)) : undefined
            }
        });
    } catch (error) {
        console.error('[EventLogger] Failed to log event:', error);
    }
}
