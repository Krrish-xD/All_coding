"""Database models for Instagram Reels data."""
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from config import DATABASE_PATH

Base = declarative_base()


class Reel(Base):
    """Model for Instagram Reel data."""
    __tablename__ = 'reels'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    reel_url = Column(String(500), unique=True, nullable=False)
    reel_id = Column(String(100), unique=True, nullable=False)
    author_username = Column(String(100))
    author_user_id = Column(String(100))
    caption = Column(Text)
    likes_count = Column(Integer)
    comments_count = Column(Integer)
    shares_count = Column(Integer)
    views_count = Column(Integer)
    video_url = Column(String(1000))
    thumbnail_url = Column(String(1000))
    scraped_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to comments
    comments = relationship("Comment", back_populates="reel", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Reel(id={self.reel_id}, author={self.author_username}, likes={self.likes_count})>"


class Comment(Base):
    """Model for Instagram Reel comments."""
    __tablename__ = 'comments'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    reel_id = Column(Integer, ForeignKey('reels.id'), nullable=False)
    comment_id = Column(String(100), unique=True)
    username = Column(String(100))
    user_id = Column(String(100))
    comment_text = Column(Text)
    likes_count = Column(Integer)
    posted_at = Column(String(100))  # Instagram provides relative time like "2h"
    rank = Column(Integer)  # 1-20 for top comments
    scraped_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to reel
    reel = relationship("Reel", back_populates="comments")
    
    def __repr__(self):
        return f"<Comment(user={self.username}, rank={self.rank})>"


# Database initialization
def init_database():
    """Initialize the database and create tables."""
    engine = create_engine(f'sqlite:///{DATABASE_PATH}', echo=False)
    Base.metadata.create_all(engine)
    return engine


def get_session():
    """Get a database session."""
    engine = create_engine(f'sqlite:///{DATABASE_PATH}', echo=False)
    Session = sessionmaker(bind=engine)
    return Session()
