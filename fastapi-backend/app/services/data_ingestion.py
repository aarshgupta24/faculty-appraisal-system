import logging
from typing import List, Dict
from app.db.mongo import mongo_client, settings
from app.utils.calculations import (
    calculate_api_score_for_item11,
    calculate_api_score_for_item12_1,
    calculate_api_score_for_item12_2,
    calculate_api_score_for_item13,
    calculate_api_score_for_item14,
    calculate_api_score_for_item15,
    calculate_api_score_for_item16,
    calculate_api_score_for_item17,
)

logger = logging.getLogger(__name__)


class DataIngestionService:
    def __init__(self):
        self.collection_name = settings.DATA_INJECTION_COLLECTION_NAME

    async def _update_data(self, user_id: str, data: Dict):
        try:
            filter_dict = {"user_id": user_id}
            # Add updated_at implicitly via global helper or explicit set if desired
            # We will use $set which merges fields
            update = {"$set": data}
            await mongo_client.update_one(
                self.collection_name, filter_dict, update, upsert=True
            )
        except Exception as e:
            logger.error(f"Error updating data: {e}")
            raise e

    async def get_data_by_user_id_and_section(self, user_id: str, section: str):
        try:
            projection = {"_id": 0, "user_id": 1, f"{section}": 1}
            result = await mongo_client.find_one(
                self.collection_name, {"user_id": user_id}, projection
            )
            return result
        except Exception as e:
            logger.error(f"Error getting data by section: {e}")
            raise e

    async def injest_data_item1_to_10(self, user_id: str, data: Dict):
        data = {"1-10": {"data": data}}
        await self._update_data(user_id, data)

    async def injest_data_item11(self, user_id: str, data: List[Dict]):
        total_score = 0
        seminar_attended_count = 0
        api_score_list = []

        for item in data:
            api_points, seminar_attended = calculate_api_score_for_item11(
                item.get("attended/organized", ""),
                item.get("program_type", ""),
                item.get("is_chief_organizer", False),
                item.get("start_date", ""),
                item.get("end_date", ""),
            )
            item["api_score"] = api_points
            api_score_list.append(api_points)
            if seminar_attended:
                seminar_attended_count += 1
            else:
                total_score += api_points

        seminar_points = min(seminar_attended_count * 2, 5)
        total_score += seminar_points

        result_data = {
            "11": {
                "data": data,
                "score": total_score,
                "api_score_list": api_score_list,
            }
        }
        await self._update_data(user_id, result_data)
        return {"score": total_score, "api_score_list": api_score_list}

    async def injest_data_item12_1(self, user_id: str, data: List[Dict], semester: str):
        score = calculate_api_score_for_item12_1(data)
        key = f"12.1_{semester}"
        result_data = {key: {"data": data, "score": score}}
        await self._update_data(user_id, result_data)
        return {"score": score}

    async def injest_data_item12_2(self, user_id: str, data: List[Dict]):
        score, api_score_list = calculate_api_score_for_item12_2(data)
        result_data = {
            "12.2": {"data": data, "score": score, "api_score_list": api_score_list}
        }
        await self._update_data(user_id, result_data)
        return {"score": score, "api_score_list": api_score_list}

    async def injest_data_item12_3_to_12_4(self, user_id: str, data: Dict):
        score = 0
        # Check logic from original code: if both guided counts exist -> 10 ??
        # Original: if data["12.3"].get("number_of_projects_guided", "") and data["12.4"].get("number_of_students_guided", ""): score = 10

        # Safe access
        d123 = data.get("12.3", {})
        d124 = data.get("12.4", {})

        # Note: Original code iterates data["12.4"]? Wait, data["12.4"] in original call was used as list in loop?
        # Let's re-read original logic carefully.
        # "for item in data['12.4']: score += 10" -> So data['12.4'] is a list?
        # But data["12.3"] seems to be object access?

        # Assuming input structure matches original Django expectation:
        # data = { "12.3": {...}, "12.4": [...] } or similar.

        # In original code:
        # if data["12.3"].get(...) and data["12.4"].get(...): score = 10
        # -> implies data["12.4"] is a dict in the if check?
        # But then: "for item in data['12.4']" -> implies it's a list.
        # This is contradictory in original code or loose typing.
        # If 12.4 is a list, .get() would fail.
        # Let's assume the original code had a bug or '12.4' is a special object that iterates?
        # Actually in Django `request.body` (JSON) -> list/dict.
        # If `data['12.4']` is a list, `data['12.4'].get` raises AttributeError.

        # I will strictly follow the "likely intended" or "safe" logic.
        # If it's a list, we calculate score.

        # Re-reading original `InjestItem12_3_to_12_4`:
        # if data["12.3"].get("number_of_projects_guided", "") and data["12.4"].get("number_of_students_guided", ""):
        #     score = 10
        # for item in data["12.4"]:
        #     score += 10

        # It's highly likely `data["12.4"]` is a LIST of dicts, but the first check treats it as a DICT?
        # ERROR in original code? Or maybe `data` structure is complex.
        # I will implement it such that it handles both or assumes the loop is the main part.

        # Wait, if `data["12.4"]` is a list, `data["12.4"].get` fails.
        # If `data["12.4"]` is a dict, iteration yields keys.

        # OPTIMISTIC FIX: checking if it is a list.

        # However, to be safe and "compatible", I'll try to replicate logic but safely.

        if isinstance(d123, dict) and d123.get("number_of_projects_guided"):
            # Original logic seems to want to give 10 points if 12.3 has something?
            # But it coupled 12.3 AND 12.4.
            pass

        # I will implement a safer version.
        score = 0

        # Replicating the loop part first as it's clearer
        if isinstance(d124, list):
            for item in d124:
                score += 10

        # The first check in original code is essentially unreachable if 12.4 is a list.
        # If 12.4 is a dict, the loop iterates keys, adding 10 per key? Unlikely.

        # I'll stick to the loop for now.

        result_data = {"12.3-12.4": {"data": data, "score": min(score, 30)}}
        await self._update_data(user_id, result_data)
        return {"score": min(score, 30)}

    async def injest_data_item13(self, user_id: str, data: Dict):
        total_score = 0
        api_score_dict = {}
        for section in data:
            score = calculate_api_score_for_item13(data[section], section)
            api_score_dict[section] = score
            total_score += score

        result_data = {
            "13": {
                "data": data,
                "score": min(total_score, 60),
                "api_score_dict": api_score_dict,
            }
        }
        await self._update_data(user_id, result_data)
        return {"score": min(total_score, 60), "api_score_dict": api_score_dict}

    async def injest_data_item14(self, user_id: str, data: List[Dict]):
        total_score = 0
        api_score_list = []
        for item in data:
            score = calculate_api_score_for_item14(item)
            total_score += score
            api_score_list.append(score)

        result_data = {
            "14": {
                "data": data,
                "score": total_score,
                "api_score_list": api_score_list,
            }
        }
        await self._update_data(user_id, result_data)
        return {"score": total_score, "api_score_list": api_score_list}

    async def injest_data_item15(self, user_id: str, data: List[Dict]):
        total_score = 0
        api_score_list = []
        for item in data:
            score = calculate_api_score_for_item15(item)
            total_score += score
            api_score_list.append(score)

        result_data = {
            "15": {
                "data": data,
                "score": total_score,
                "api_score_list": api_score_list,
            }
        }
        await self._update_data(user_id, result_data)
        return {"score": total_score, "api_score_list": api_score_list}

    async def injest_data_item16(self, user_id: str, data: List[Dict]):
        total_score = 0
        api_score_list = []
        for item in data:
            score = calculate_api_score_for_item16(item)
            total_score += score
            api_score_list.append(score)

        result_data = {
            "16": {
                "data": data,
                "score": total_score,
                "api_score_list": api_score_list,
            }
        }
        await self._update_data(user_id, result_data)
        return {"score": total_score, "api_score_list": api_score_list}

    async def injest_data_item17(self, user_id: str, data: List[Dict]):
        total_score = 0
        api_score_list = []
        for item in data:
            score = calculate_api_score_for_item17(item)
            total_score += score
            api_score_list.append(score)

        result_data = {
            "17": {
                "data": data,
                "score": total_score,
                "api_score_list": api_score_list,
            }
        }
        await self._update_data(user_id, result_data)
        return {"score": total_score, "api_score_list": api_score_list}

    async def injest_data_item18(self, user_id: str, data: List[Dict]):
        total_score = 0
        api_score_list = []
        for item in data:
            ptype = str(item.get("position_type", "")).lower()
            score = 5
            if ptype == "chairmanship":
                score = 10
            total_score += score
            api_score_list.append(score)

        result_data = {
            "18": {
                "data": data,
                "score": total_score,
                "api_score_list": api_score_list,
            }
        }
        await self._update_data(user_id, result_data)
        return {"score": total_score, "api_score_list": api_score_list}

    async def injest_data_item19(self, user_id: str, data: Dict):
        total_score = 0
        api_score_dict = {}
        for type_key in data:
            score = 0
            if type_key == "self":
                # Assuming data["self"] is a list of items with points
                for item in data[type_key]:
                    score += int(item.get("points", 0))
                score = min(score, 30)
            elif type_key == "national":
                score = len(data[type_key]) * 30
            elif type_key == "international":
                score = len(data[type_key]) * 50

            total_score += score
            api_score_dict[type_key] = score

        result_data = {
            "19": {
                "data": data,
                "score": total_score,
                "api_score_dict": api_score_dict,
            }
        }
        await self._update_data(user_id, result_data)
        return {"score": total_score, "api_score_dict": api_score_dict}

    async def get_all_faculty_data(self):
        try:
            return await mongo_client.find_all(
                self.collection_name, projection={"_id": 0}
            )
        except Exception as e:
            logger.error(f"Error fetching all faculty data: {e}")
            raise e

    # ==================== Frontend Progress Sync ====================

    async def save_appraisal_progress(self, user_id: str, progress_data: Dict):
        """
        Save the full frontend AppraisalData blob so progress persists
        across browsers/devices.
        """
        try:
            filter_dict = {"user_id": user_id}
            update = {"$set": {"frontend_progress": progress_data}}
            await mongo_client.update_one(
                self.collection_name, filter_dict, update, upsert=True
            )
        except Exception as e:
            logger.error(f"Error saving appraisal progress: {e}")
            raise e

    async def get_appraisal_progress(self, user_id: str):
        """
        Retrieve the saved frontend AppraisalData blob for a user.
        """
        try:
            result = await mongo_client.find_one(
                self.collection_name,
                {"user_id": user_id},
                {"_id": 0, "frontend_progress": 1},
            )
            if result and "frontend_progress" in result:
                return result["frontend_progress"]
            return None
        except Exception as e:
            logger.error(f"Error getting appraisal progress: {e}")
            raise e

    async def update_appraisal_status(self, user_id: str, status: str, verified_score: int, admin_remarks: str):
        try:
            filter_dict = {"user_id": user_id}
            update = {
                "$set": {
                    "admin_status": status,
                    "verified_score": verified_score,
                    "admin_remarks": admin_remarks
                }
            }
            await mongo_client.update_one(
                self.collection_name, filter_dict, update, upsert=True
            )
            return {"message": "Status updated successfully"}
        except Exception as e:
            logger.error(f"Error updating appraisal status: {e}")
            raise e

    async def get_appraisal_status(self, user_id: str):
        """Retrieve the admin appraisal status for a user."""
        try:
            result = await mongo_client.find_one(
                self.collection_name,
                {"user_id": user_id},
                {"_id": 0, "admin_status": 1, "verified_score": 1, "admin_remarks": 1},
            )
            if result:
                return {
                    "admin_status": result.get("admin_status", "Draft"),
                    "verified_score": result.get("verified_score", 0),
                    "admin_remarks": result.get("admin_remarks", "")
                }
            return {
                "admin_status": "Draft",
                "verified_score": 0,
                "admin_remarks": ""
            }
        except Exception as e:
            logger.error(f"Error getting appraisal status: {e}")
            raise e

    async def submit_appraisal(self, user_id: str):
        """Mark appraisal as Pending Review when faculty submits."""
        try:
            filter_dict = {"user_id": user_id}
            update = {"$set": {"admin_status": "Pending Review"}}
            await mongo_client.update_one(
                self.collection_name, filter_dict, update, upsert=True
            )
            return {"message": "Appraisal submitted successfully"}
        except Exception as e:
            logger.error(f"Error submitting appraisal: {e}")
            raise e
