from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional

class Settings(BaseSettings):
	secret_key: str = Field(default="dev-secret-change")
	algorithm: str = Field(default="HS256")
	access_token_expires_minutes: int = Field(default=60*24)
	database_url: str = Field(default="sqlite:///./app.db")
	vector_store_dir: str = Field(default="./vector_store")
	openai_api_key: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")
	
	model_config = {
		"env_file": ".env",
		"protected_namespaces": ("settings_",),
		"extra": "ignore",
	}

settings = Settings()
