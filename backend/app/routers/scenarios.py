from fastapi import APIRouter, Depends, HTTPException
from typing import List
from ..schemas import ScenarioCreate, ScenarioResponse
from ..config import get_supabase_client, get_current_user
from typing import Dict, Any

router = APIRouter(
    prefix="/scenarios",
    tags=["scenarios"]
)

@router.get("", response_model=List[ScenarioResponse])
async def get_scenarios(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Get all available scenarios.
    """
    try:
        result = supabase.table("scenarios").select("*").execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching scenarios: {str(e)}")

@router.get("/{scenario_id}", response_model=ScenarioResponse)
async def get_scenario(
    scenario_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Get a specific scenario by ID.
    """
    try:
        result = supabase.table("scenarios").select("*").eq("id", scenario_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Scenario not found")
        
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching scenario: {str(e)}")

@router.post("", response_model=ScenarioResponse)
async def create_scenario(
    scenario: ScenarioCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Create a new scenario.
    """
    try:
        result = supabase.table("scenarios").insert(scenario.dict()).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating scenario: {str(e)}")

@router.put("/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(
    scenario_id: str,
    scenario: ScenarioCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Update an existing scenario.
    """
    try:
        result = supabase.table("scenarios").update(scenario.dict()).eq("id", scenario_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Scenario not found")
        
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating scenario: {str(e)}")

@router.delete("/{scenario_id}")
async def delete_scenario(
    scenario_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Delete a scenario.
    """
    try:
        result = supabase.table("scenarios").delete().eq("id", scenario_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Scenario not found")
        
        return {"message": "Scenario deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting scenario: {str(e)}") 