from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base, Session

app = FastAPI(title="CampusLive API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://campus-live-liard.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLite database
DATABASE_URL = "sqlite:///./campuslive.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


# Database table
class IssueDB(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    location = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, default="Reported", nullable=False)
    cancelled_at = Column(DateTime, nullable=True)
# User database table
class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="Student", nullable=False)

# Create table automatically
Base.metadata.create_all(bind=engine)
# Add cancelled_at column if it doesn't exist
with engine.connect() as connection:
    columns = connection.exec_driver_sql(
        "PRAGMA table_info(issues)"
    ).fetchall()

    column_names = [column[1] for column in columns]

    if "cancelled_at" not in column_names:
        connection.exec_driver_sql(
            "ALTER TABLE issues ADD COLUMN cancelled_at DATETIME"
        )
        connection.commit()
# Add status column to existing database if missing
with engine.connect() as connection:
    columns = connection.exec_driver_sql(
        "PRAGMA table_info(issues)"
    ).fetchall()

    column_names = [column[1] for column in columns]

    if "status" not in column_names:
        connection.exec_driver_sql(
            "ALTER TABLE issues ADD COLUMN status "
            "VARCHAR NOT NULL DEFAULT 'Reported'"
        )
        connection.commit()


# Request model
class Issue(BaseModel):
    location: str
    category: str
    description: str


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "Student"


# Database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def home():
    return {"message": "Welcome to CampusLive!"}
# Create a new user
@app.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):

    existing_user = db.query(UserDB).filter(
        UserDB.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = UserDB(
        name=user.name,
        email=user.email,
        password=user.password,
        role=user.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Account created successfully",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role
        }
    }



class UserLogin(BaseModel):
    email: str
    password: str


@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):

    existing_user = db.query(UserDB).filter(
        UserDB.email == user.email
    ).first()

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if existing_user.password != user.password:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    return {
        "message": "Login successful",
        "user": {
            "id": existing_user.id,
            "name": existing_user.name,
            "email": existing_user.email,
            "role": existing_user.role
        }
    }

# Create and save an issue
@app.post("/issues")
def create_issue(issue: Issue, db: Session = Depends(get_db)):

    new_issue = IssueDB(
        location=issue.location,
        category=issue.category,
        description=issue.description
    )

    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)

    return {
        "message": "Issue reported successfully",
        "issue": {
            "id": new_issue.id,
            "location": new_issue.location,
            "category": new_issue.category,
            "description": new_issue.description
        }
    }


# Get all reported issues
@app.get("/issues")
def get_issues(db: Session = Depends(get_db)):
    issues = db.query(IssueDB).all()

    cutoff_time = datetime.now() - timedelta(hours=24)

    visible_issues = [
        issue for issue in issues
        if issue.status != "Cancelled"
        or (
            issue.cancelled_at is not None
            and issue.cancelled_at > cutoff_time
        )
    ]

    return visible_issues
# Cancel a reported issue
@app.patch("/issues/{issue_id}/cancel")
def cancel_issue(issue_id: int, db: Session = Depends(get_db)):

    issue = db.query(IssueDB).filter(
        IssueDB.id == issue_id
    ).first()

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Issue not found"
        )

    if issue.status == "Cancelled":
        return {"message": "Issue is already cancelled"}

    if issue.status == "Resolved":
        raise HTTPException(
            status_code=400,
            detail="Resolved issues cannot be cancelled"
        )

    issue.status = "Cancelled"
    issue.cancelled_at = datetime.now()

    db.commit()
    db.refresh(issue)

    return {
        "message": "Issue cancelled successfully",
        "issue_id": issue.id,
        "status": issue.status
    }