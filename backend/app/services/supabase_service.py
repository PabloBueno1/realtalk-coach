from supabase import create_client
import os
from typing import Optional, Dict, Any

class SupabaseService:
    def __init__(self):
        self.client = create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_KEY')
        )

    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile from Supabase"""
        response = self.client.table('profiles').select('*').eq('id', user_id).execute()
        return response.data[0] if response.data else None

    async def create_user_profile(self, user_id: str, email: str) -> Dict[str, Any]:
        """Create a new user profile in Supabase"""
        profile_data = {
            'id': user_id,
            'email': email,
            'preferences': {}
        }
        response = self.client.table('profiles').insert(profile_data).execute()
        return response.data[0]

    async def update_user_profile(self, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile in Supabase"""
        response = self.client.table('profiles').update(updates).eq('id', user_id).execute()
        return response.data[0]

    async def get_user_conversations(self, user_id: str) -> list:
        """Get all conversations for a user"""
        response = self.client.table('conversations').select('*').eq('user_id', user_id).execute()
        return response.data

    async def create_conversation(self, user_id: str, title: str, scenario: str) -> Dict[str, Any]:
        """Create a new conversation"""
        conversation_data = {
            'user_id': user_id,
            'title': title,
            'scenario': scenario
        }
        response = self.client.table('conversations').insert(conversation_data).execute()
        return response.data[0]

    async def update_conversation(self, conversation_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update a conversation"""
        response = self.client.table('conversations').update(updates).eq('id', conversation_id).execute()
        return response.data[0] 