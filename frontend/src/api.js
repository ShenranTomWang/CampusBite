import seed from "./seed.json";

const storageKey = "campusbite:demo:v1";
const isStaticDemo = import.meta.env.VITE_STATIC_DEMO === "true";

function readState() {
    const stored = localStorage.getItem(storageKey);
    return stored
        ? JSON.parse(stored)
        : {
              profile: structuredClone(seed.profile),
              votes: {},
              ratings: {},
              comments: {},
          };
}

export function demoFeed(state) {
    const windows = seed.windows
        .map((original) => {
            const w = structuredClone(original);
            w.myVote = state.votes[w.id] || 0;
            w.votes = w.base_votes + w.myVote;
            w.myRatings = state.ratings[w.id] || {};
            const ratings = Object.values(w.myRatings);
            w.ratingCount = w.base_count + ratings.length;
            w.rating =
                Math.round(
                    ((w.base_rating * w.base_count +
                        ratings.reduce((sum, rating) => sum + rating, 0)) /
                        w.ratingCount) *
                        10,
                ) / 10;
            w.comments = [...(state.comments[w.id] || []), ...w.comments];
            const matched = state.profile.cuisines.includes(w.cuisine);
            w.reason = matched ? "Matches your taste" : "Loved on campus";
            w.score =
                (matched ? 3 : 0) +
                w.rating +
                w.votes / 200 +
                (w.price <= state.profile.budget ? 1 : -3);
            return w;
        })
        .filter(
            (w) =>
                !state.profile.vegetarian ||
                w.cuisine === "Vegetarian" ||
                [2, 6, 7, 9, 14, 15, 19, 20].includes(w.id),
        );
    return { windows: windows.sort((a, b) => b.score - a.score), profile: state.profile };
}

export async function request(path = "feed", body) {
    if (!isStaticDemo) {
        const response = await fetch(
            `/api/${path}`,
            body === undefined
                ? undefined
                : {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(body),
                  },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load feed");
        return result;
    }
    const state = readState();
    if (path === "profile") state.profile = body;
    if (path === "vote") state.votes[body.windowId] = body.value;
    if (path === "rate") {
        state.ratings[body.windowId] = {
            ...state.ratings[body.windowId],
            [body.target]: body.value,
        };
    }
    if (path === "comment") {
        const text = body.text.trim();
        if (!text || text.length > 500) throw new Error("Comment must be 1–500 characters");
        state.comments[body.windowId] = [
            {
                id: crypto.randomUUID(),
                window_id: body.windowId,
                author: "You",
                text,
                target: body.target,
            },
            ...(state.comments[body.windowId] || []),
        ];
    }
    if (body !== undefined) localStorage.setItem(storageKey, JSON.stringify(state));
    return demoFeed(state);
}

export const storageNotice = isStaticDemo
    ? "Demo profile · saved in this browser"
    : "Demo profile · saved on this local server";
