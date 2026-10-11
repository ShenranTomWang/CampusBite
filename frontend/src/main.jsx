import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
    ArrowUp,
    ArrowDown,
    ArrowUpRight,
    ChevronDown,
    ChevronUp,
    SlidersHorizontal,
    Star,
    MessageCircle,
    MapPin,
    X,
    Send,
    Utensils,
    Sparkles,
    Check,
    Leaf,
} from "lucide-react";
import "./style.css";
import { request, storageNotice } from "./api.js";

const cuisines = ["Asian", "Italian", "Vegetarian", "American", "Mexican", "Indian"];

function App() {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [panel, setPanel] = useState(null);
    const [selected, setSelected] = useState(null);
    const [target, setTarget] = useState("dish");
    const [comment, setComment] = useState("");
    const [busy, setBusy] = useState(false);
    const [mode, setMode] = useState("foryou");
    const [active, setActive] = useState(0);
    const [draft, setDraft] = useState(null);
    const feedRef = useRef(null);
    useEffect(() => {
        request()
            .then(setData)
            .catch((error) => setError(error.message));
    }, []);
    async function mutate(path, body) {
        setBusy(true);
        setError("");
        try {
            const next = await request(path, body);
            // Keep the current scroll order stable while interacting.
            setData((previous) => ({
                ...next,
                windows:
                    path === "profile"
                        ? next.windows
                        : previous.windows
                              .map((w) => next.windows.find((n) => n.id === w.id))
                              .filter(Boolean),
            }));
            return true;
        } catch (e) {
            setError(e.message || "Something went wrong. Please try again.");
            return false;
        } finally {
            setBusy(false);
        }
    }
    const windows = data
        ? mode === "popular"
            ? [...data.windows].sort((a, b) => b.votes - a.votes)
            : mode === "new"
              ? [...data.windows].sort(
                    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
                )
              : data.windows
        : [];
    const current = data?.windows.find((w) => w.id === selected);
    function navigate(delta) {
        const next = Math.max(0, Math.min(windows.length - 1, active + delta));
        feedRef.current?.children[next]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    function openFeedback(w, kind) {
        setSelected(w.id);
        setPanel(kind);
        setTarget("dish");
    }
    return (
        <div className="app">
            <aside className="sidebar">
                <a className="brand" href={import.meta.env.BASE_URL} aria-label="Campus Bites home">
                    <span className="brand-icon">
                        <Utensils size={21} />
                    </span>
                    campus<span className="brand-light">bites</span>
                    <span className="brand-dot">.</span>
                </a>
                <div className="side-main">
                    <div className="eyebrow">GOOD FOOD. REAL OPINIONS.</div>
                    <h1>
                        Your next
                        <br />
                        favorite bite
                        <br />
                        is one scroll
                        <br />
                        away<span>.</span>
                    </h1>
                    <p>
                        Discover what’s cooking on campus.
                        <br />
                        Rated by students, for students.
                    </p>
                    <button
                        className="profile-button"
                        onClick={() => {
                            setDraft(structuredClone(data.profile));
                            setPanel("profile");
                        }}
                        disabled={!data}
                    >
                        <SlidersHorizontal size={17} /> Your taste profile{" "}
                        <ArrowUpRight size={16} />
                    </button>
                    <div className="taste-tags">
                        {data?.profile.cuisines.map((c) => (
                            <span key={c}>{c}</span>
                        ))}
                        {data?.profile.vegetarian && <span>Veggie only</span>}
                    </div>
                </div>
                <div className="side-bottom">
                    <div className="avatars">
                        <span>JL</span>
                        <span>AK</span>
                        <span>SR</span>
                        <span>+</span>
                    </div>
                    <p>
                        A little less <i>“what should I eat?”</i>
                        <br />A lot more <strong>“that looks good.”</strong>
                    </p>
                    <div className="campus-status">
                        <span /> THE CAMPUS TABLE <span className="demo">DEMO</span>
                    </div>
                </div>
            </aside>
            <main>
                <header>
                    <div className="feed-tabs">
                        <button
                            className={mode === "foryou" ? "chosen" : ""}
                            onClick={() => {
                                setMode("foryou");
                                setActive(0);
                                feedRef.current?.scrollTo(0, 0);
                            }}
                        >
                            <Sparkles size={15} /> For you
                        </button>
                        <button
                            className={mode === "popular" ? "chosen" : ""}
                            onClick={() => {
                                setMode("popular");
                                setActive(0);
                                feedRef.current?.scrollTo(0, 0);
                            }}
                        >
                            Campus favorites
                        </button>
                        <button
                            className={mode === "new" ? "chosen" : ""}
                            onClick={() => {
                                setMode("new");
                                setActive(0);
                                feedRef.current?.scrollTo(0, 0);
                            }}
                        >
                            New
                        </button>
                    </div>
                    <button
                        className="mobile-profile"
                        aria-label="Your taste profile"
                        disabled={!data}
                        onClick={() => {
                            setDraft(structuredClone(data.profile));
                            setPanel("profile");
                        }}
                    >
                        <SlidersHorizontal size={18} />
                    </button>
                    <span className="header-note">
                        <span /> 20 windows. Endless good bites.
                    </span>
                </header>
                {error && (
                    <div className="error" role="alert">
                        {error}
                        <button onClick={() => setError("")} aria-label="Dismiss error">
                            <X size={16} />
                        </button>
                    </div>
                )}
                {!data && !error && <div className="loading">Setting the table…</div>}
                <div
                    className="feed"
                    ref={feedRef}
                    onScroll={(e) =>
                        setActive(
                            Math.round(e.currentTarget.scrollTop / e.currentTarget.clientHeight),
                        )
                    }
                >
                    {windows.map((w, index) => (
                        <section className="slide" key={w.id} aria-label={`${w.name}: ${w.dish}`}>
                            <article
                                className="food-card"
                                style={{
                                    "--food-image": `url(https://images.unsplash.com/${w.photo}?auto=format&fit=crop&w=1400&q=85)`,
                                }}
                            >
                                <div className="image-shade" />
                                <div className="card-top">
                                    <span className="match">
                                        <Sparkles size={13} />
                                        {mode === "new"
                                            ? `Added ${new Date(w.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                                            : mode === "popular"
                                              ? "Campus favorite"
                                              : w.reason}
                                    </span>
                                    <span className="count">
                                        {String(index + 1).padStart(2, "0")}{" "}
                                        <span>/ {windows.length}</span>
                                    </span>
                                </div>
                                <div className="food-info">
                                    <div className="window-label">
                                        <span>{w.emoji}</span>
                                        <div>
                                            {w.name}
                                            <small>
                                                WINDOW {String(w.id).padStart(2, "0")}{" "}
                                                <span>•</span> {w.hall}
                                            </small>
                                        </div>
                                    </div>
                                    <h2>{w.dish}</h2>
                                    <div className="food-tags">
                                        <span>{w.cuisine}</span>
                                        <span>Student favorite</span>
                                    </div>
                                    <div className="food-meta">
                                        <span className="rating">
                                            <Star size={17} fill="currentColor" />{" "}
                                            {w.rating.toFixed(1)}{" "}
                                            <small>({w.ratingCount} ratings)</small>
                                        </span>
                                        <span className="price">${w.price.toFixed(2)}</span>
                                    </div>
                                    <div className="card-divider" />
                                    <div className="card-bottom">
                                        <span>
                                            <MapPin size={14} />
                                            {w.hall}
                                        </span>
                                        <button onClick={() => openFeedback(w, "comments")}>
                                            See what students say <ArrowUpRight size={15} />
                                        </button>
                                    </div>
                                </div>
                            </article>
                            <div className="actions">
                                <button
                                    className={w.myVote === 1 ? "voted" : ""}
                                    disabled={busy}
                                    aria-label={`Upvote ${w.name}`}
                                    onClick={() =>
                                        mutate("vote", {
                                            windowId: w.id,
                                            value: w.myVote === 1 ? 0 : 1,
                                        })
                                    }
                                >
                                    <ArrowUp size={25} />
                                </button>
                                <strong>{w.votes}</strong>
                                <small>upvotes</small>
                                <button
                                    className={`downvote ${w.myVote === -1 ? "voted" : ""}`}
                                    disabled={busy}
                                    aria-label={`Downvote ${w.name}`}
                                    onClick={() =>
                                        mutate("vote", {
                                            windowId: w.id,
                                            value: w.myVote === -1 ? 0 : -1,
                                        })
                                    }
                                >
                                    <ArrowDown size={22} />
                                </button>
                                <div className="action-line" />
                                <button
                                    aria-label={`Comment on ${w.name}`}
                                    onClick={() => openFeedback(w, "comments")}
                                >
                                    <MessageCircle size={23} />
                                </button>
                                <strong>{w.comments.length}</strong>
                                <small>comments</small>
                                <button
                                    className="rate-action"
                                    onClick={() => openFeedback(w, "rate")}
                                    aria-label={`Rate ${w.name}`}
                                >
                                    <Star size={24} />
                                </button>
                                <small>Rate it</small>
                            </div>
                        </section>
                    ))}
                </div>
                <footer>
                    <span>
                        <span className="keyboard-key">↓</span> Scroll to discover something
                        delicious
                    </span>
                    <div>
                        <button
                            onClick={() => navigate(-1)}
                            disabled={active === 0}
                            aria-label="Previous dish"
                        >
                            <ChevronUp size={18} />
                        </button>
                        <button
                            onClick={() => navigate(1)}
                            disabled={active >= windows.length - 1}
                            aria-label="Next dish"
                        >
                            <ChevronDown size={18} />
                        </button>
                    </div>
                </footer>
            </main>
            {panel && (
                <div className="overlay" onClick={() => setPanel(null)}>
                    <section
                        className="modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label={panel === "profile" ? "Taste profile" : "Dish feedback"}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="close"
                            aria-label="Close dialog"
                            onClick={() => setPanel(null)}
                        >
                            <X size={20} />
                        </button>
                        {panel === "profile" ? (
                            <>
                                <div className="modal-icon">
                                    <SlidersHorizontal />
                                </div>
                                <div className="eyebrow">MAKE IT YOURS</div>
                                <h2>Your kind of delicious.</h2>
                                <p>
                                    A few preferences help us find your next favorite. Popularity
                                    and student ratings do the rest.
                                </p>
                                <label className="field-label">What are you craving?</label>
                                <div className="cuisine-picker">
                                    {cuisines.map((c) => (
                                        <button
                                            className={draft.cuisines.includes(c) ? "picked" : ""}
                                            key={c}
                                            onClick={() =>
                                                setDraft({
                                                    ...draft,
                                                    cuisines: draft.cuisines.includes(c)
                                                        ? draft.cuisines.filter((v) => v !== c)
                                                        : [...draft.cuisines, c],
                                                })
                                            }
                                        >
                                            {c}
                                            {draft.cuisines.includes(c) && <Check size={14} />}
                                        </button>
                                    ))}
                                </div>
                                <label className="field-label" htmlFor="budget">
                                    Budget per meal{" "}
                                    <strong>${Number(draft.budget).toFixed(2)}</strong>
                                </label>
                                <input
                                    id="budget"
                                    type="range"
                                    min="5"
                                    max="15"
                                    step="0.5"
                                    value={draft.budget}
                                    onChange={(e) =>
                                        setDraft({ ...draft, budget: Number(e.target.value) })
                                    }
                                />
                                <div className="range-labels">
                                    <span>$5</span>
                                    <span>$15</span>
                                </div>
                                <label className="vegetarian">
                                    <Leaf size={20} />
                                    Vegetarian dishes only
                                    <input
                                        type="checkbox"
                                        checked={draft.vegetarian}
                                        onChange={(e) =>
                                            setDraft({ ...draft, vegetarian: e.target.checked })
                                        }
                                    />
                                </label>
                                <button
                                    className="primary"
                                    disabled={busy}
                                    onClick={async () => {
                                        if (await mutate("profile", draft)) {
                                            setPanel(null);
                                            setActive(0);
                                            feedRef.current?.scrollTo(0, 0);
                                        }
                                    }}
                                >
                                    {busy ? "Saving…" : "Find my next bite"}
                                    <ArrowUpRight size={18} />
                                </button>
                                <small className="privacy-note">{storageNotice}</small>
                            </>
                        ) : (
                            <>
                                <div className="eyebrow">THE STUDENT VERDICT</div>
                                <h2>{current?.name}</h2>
                                <p>{current?.dish}</p>
                                <div className="target-tabs">
                                    {["dish", "window"].map((t) => (
                                        <button
                                            key={t}
                                            className={target === t ? "picked" : ""}
                                            onClick={() => setTarget(t)}
                                        >
                                            The {t}
                                        </button>
                                    ))}
                                </div>
                                <label className="field-label">
                                    {current?.myRatings[target]
                                        ? `Your rating: ${current.myRatings[target]} / 5`
                                        : `How was the ${target}?`}
                                </label>
                                <div className="stars">
                                    {[1, 2, 3, 4, 5].map((value) => (
                                        <button
                                            key={value}
                                            disabled={busy}
                                            aria-label={`Rate ${target} ${value} stars`}
                                            onClick={() =>
                                                mutate("rate", {
                                                    windowId: selected,
                                                    target,
                                                    value,
                                                })
                                            }
                                        >
                                            <Star
                                                size={31}
                                                fill={
                                                    value <= (current?.myRatings[target] || 0)
                                                        ? "currentColor"
                                                        : "none"
                                                }
                                            />
                                        </button>
                                    ))}
                                </div>
                                <div className="comments-list">
                                    {current?.comments
                                        .filter((c) => c.target === target)
                                        .map((c) => (
                                            <div className="comment" key={c.id}>
                                                <span className="avatar">
                                                    {c.author === "You"
                                                        ? "YO"
                                                        : c.author.slice(0, 2).toUpperCase()}
                                                </span>
                                                <div>
                                                    <strong>{c.author}</strong>
                                                    <p>{c.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                                <form
                                    className="comment-form"
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        if (
                                            await mutate("comment", {
                                                windowId: selected,
                                                target,
                                                text: comment,
                                            })
                                        )
                                            setComment("");
                                    }}
                                >
                                    <input
                                        aria-label="Your comment"
                                        placeholder={`What did you think of the ${target}?`}
                                        value={comment}
                                        maxLength={500}
                                        onChange={(e) => setComment(e.target.value)}
                                        required
                                    />
                                    <button
                                        disabled={busy || !comment.trim()}
                                        aria-label="Post comment"
                                    >
                                        <Send size={19} />
                                    </button>
                                </form>
                            </>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}
createRoot(document.getElementById("root")).render(<App />);
