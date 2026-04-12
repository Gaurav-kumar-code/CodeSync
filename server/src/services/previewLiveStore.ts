type LivePreviewEntry = {
    html: string
    updatedAt: number
    entryFilePath: string
}

const LIVE_PREVIEW_LIMIT = 100
const livePreviewStore = new Map<string, LivePreviewEntry>()

const setLivePreview = (
    liveSessionId: string,
    payload: Omit<LivePreviewEntry, "updatedAt">,
) => {
    livePreviewStore.set(liveSessionId, {
        ...payload,
        updatedAt: Date.now(),
    })

    if (livePreviewStore.size > LIVE_PREVIEW_LIMIT) {
        const firstKey = livePreviewStore.keys().next().value
        if (firstKey) {
            livePreviewStore.delete(firstKey)
        }
    }
}

const getLivePreview = (liveSessionId: string) => {
    return livePreviewStore.get(liveSessionId)
}

export { getLivePreview, setLivePreview }