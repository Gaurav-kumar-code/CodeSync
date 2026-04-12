"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLivePreview = exports.getLivePreview = void 0;
const LIVE_PREVIEW_LIMIT = 100;
const livePreviewStore = new Map();
const setLivePreview = (liveSessionId, payload) => {
    livePreviewStore.set(liveSessionId, {
        ...payload,
        updatedAt: Date.now(),
    });
    if (livePreviewStore.size > LIVE_PREVIEW_LIMIT) {
        const firstKey = livePreviewStore.keys().next().value;
        if (firstKey) {
            livePreviewStore.delete(firstKey);
        }
    }
};
exports.setLivePreview = setLivePreview;
const getLivePreview = (liveSessionId) => {
    return livePreviewStore.get(liveSessionId);
};
exports.getLivePreview = getLivePreview;
