from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, tasks, annotations, rewards, analytics

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Blockchain Annotation Platform",
    description="Decentralized crowdsourcing annotation with Ethereum rewards and Fleiss' Kappa validation.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://annotchain.vercel.app",
        "http://localhost:3000",
        # Add your Vercel URL here after deployment:
        # "https://your-app.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(annotations.router)
app.include_router(rewards.router)
app.include_router(analytics.router)


@app.get("/")
def root():
    return {
        "name":    "Blockchain Annotation Platform API",
        "version": "1.0.0",
        "docs":    "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
