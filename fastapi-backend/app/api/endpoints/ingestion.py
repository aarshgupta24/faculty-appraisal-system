from fastapi import APIRouter, HTTPException, Query, Body, status
from typing import List, Dict, Any, Optional
from app.services.data_ingestion import DataIngestionService

router = APIRouter()
service = DataIngestionService()


def _extract_payload(data: Dict, key: str = "data") -> Any:
    """Helper to extract payload either from data key or use body if valid."""
    # If the specific key exists, return it
    if key in data:
        return data[key]

    # If not, and we need a list, we might have to be careful.
    # But often the body IS the payload mixed with user_id.
    # We clean user_id from it if we return the whole body as dict.
    payload = data.copy()
    payload.pop("user_id", None)
    return payload


def _extract_list_payload(data: Dict, key: str = "data") -> List[Dict]:
    """Helper to safely get a list payload."""
    items = data.get(key)
    if isinstance(items, list):
        return items
    # If data itself is a list? No, Body is Dict.
    # If "data" is missing, maybe the body *is* the list wrapped?
    # But here we input Dict.
    # Fallback: empty list
    return []


@router.get("/get-item-by-section/")
async def get_item_by_section(
    user_id: str = Query(..., description="User ID"),
    section: str = Query(..., description="Section identifier"),
):
    try:
        result = await service.get_data_by_user_id_and_section(user_id, section)
        return {"message": "Data fetched successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error getting data by section")


@router.post("/injest-item-1-to-10/")
async def injest_item_1_to_10(data: Dict = Body(...)):
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    try:
        await service.injest_data_item1_to_10(user_id, data)
        return {"message": "Data injested successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Error injesting data for item 1 to 10"
        )


@router.post("/injest-item-11/")
async def injest_item_11(data: Dict = Body(...)):
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    items = _extract_list_payload(data)

    try:
        result = await service.injest_data_item11(user_id, items)
        return {"message": "Data injested successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error injesting data for item 11")


@router.post("/injest-item-12-1/")
async def injest_item_12_1(data: Dict = Body(...)):
    user_id = data.get("user_id")
    semester = data.get("semester")
    if not user_id or not semester:
        raise HTTPException(status_code=400, detail="User ID and Semester are required")

    items = _extract_list_payload(data)

    try:
        result = await service.injest_data_item12_1(user_id, items, semester)
        return {"message": "Data injested successfully", "result": result}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Error injesting data for item 12.1"
        )


@router.post("/injest-item-12-2/")
async def injest_item_12_2(data: Dict = Body(...)):
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    items = _extract_list_payload(data)
    try:
        result = await service.injest_data_item12_2(user_id, items)
        return {"message": "Data injested successfully", "result": result}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Error injesting data for item 12.2"
        )


@router.post("/injest-item-12-3-to-12-4/")
async def injest_item_12_3_to_12_4(data: Dict = Body(...)):
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    payload = _extract_payload(data)

    try:
        result = await service.injest_data_item12_3_to_12_4(user_id, payload)
        return {"message": "Data injested successfully", "result": result}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Error injesting data for item 12.3 to 12.4"
        )


@router.post("/injest-item-13/")
async def injest_item_13(data: Dict = Body(...)):
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    payload = _extract_payload(data)

    try:
        result = await service.injest_data_item13(user_id, payload)
        return {"message": "Data injested successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error injesting data for item 13")


@router.post("/injest-item-14/")
async def injest_item_14(data: Dict = Body(...)):
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    items = _extract_list_payload(data)

    try:
        result = await service.injest_data_item14(user_id, items)
        return {"message": "Data injested successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error injesting data for item 14")


@router.post("/injest-item-15/")
async def injest_item_15(data: Dict = Body(...)):
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    items = _extract_list_payload(data)

    try:
        result = await service.injest_data_item15(user_id, items)
        return {"message": "Data injested successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error injesting data for item 15")


@router.post("/injest-item-16/")
async def injest_item_16(data: Dict = Body(...)):
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    items = _extract_list_payload(data)

    try:
        result = await service.injest_data_item16(user_id, items)
        return {"message": "Data injested successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error injesting data for item 16")


@router.post("/injest-item-17/")
async def injest_item_17(data: Dict = Body(...)):
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    items = _extract_list_payload(data)

    try:
        result = await service.injest_data_item17(user_id, items)
        return {"message": "Data injested successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error injesting data for item 17")


@router.post("/injest-item-18/")
async def injest_item_18(data: Dict = Body(...)):
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    items = _extract_list_payload(data)

    try:
        result = await service.injest_data_item18(user_id, items)
        return {"message": "Data injested successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error injesting data for item 18")


@router.post("/injest-item-19/")
async def injest_item_19(data: Dict = Body(...)):
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    payload = _extract_payload(data)

    try:
        result = await service.injest_data_item19(user_id, payload)
        return {"message": "Data injested successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error injesting data for item 19")


@router.get("/get-all-faculty-data/")
async def get_all_faculty_data():
    try:
        result = await service.get_all_faculty_data()
        return {"message": "Data fetched successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error fetching faculty data")


@router.post("/sync-appraisal-progress/")
async def sync_appraisal_progress(data: Dict = Body(...)):
    """Save the full frontend AppraisalData blob for cross-browser persistence."""
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    progress = data.get("data")
    if progress is None:
        raise HTTPException(status_code=400, detail="Progress data is required")

    try:
        await service.save_appraisal_progress(user_id, progress)
        return {"message": "Progress synced successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error syncing appraisal progress")


@router.get("/get-appraisal-progress/")
async def get_appraisal_progress(
    user_id: str = Query(..., description="User ID"),
):
    """Retrieve the saved frontend AppraisalData blob for a user."""
    try:
        result = await service.get_appraisal_progress(user_id)
        return {"message": "Progress fetched successfully", "result": result}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Error fetching appraisal progress"
        )


@router.post("/update-appraisal-status/")
async def update_appraisal_status(data: Dict = Body(...)):
    """Update the appraisal status, verified score, and admin remarks."""
    user_id = data.get("user_id")
    status_val = data.get("status")
    verified_score = data.get("verified_score", 0)
    admin_remarks = data.get("admin_remarks", "")

    if not user_id or not status_val:
        raise HTTPException(status_code=400, detail="User ID and status are required")

    try:
        await service.update_appraisal_status(user_id, status_val, verified_score, admin_remarks)
        return {"message": "Appraisal status updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error updating appraisal status")

@router.get("/get-appraisal-status/")
async def get_appraisal_status(
    user_id: str = Query(..., description="User ID"),
):
    """Retrieve the admin appraisal status for a user."""
    try:
        result = await service.get_appraisal_status(user_id)
        return {"message": "Status fetched successfully", "result": result}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Error fetching appraisal status"
        )

@router.post("/submit-appraisal/")
async def submit_appraisal(data: Dict = Body(...)):
    """Mark appraisal as Pending Review when faculty submits."""
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")
    try:
        await service.submit_appraisal(user_id)
        return {"message": "Appraisal submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error submitting appraisal")

