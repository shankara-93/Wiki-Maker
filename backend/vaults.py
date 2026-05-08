"""Vault CRUD operations."""
from supabase import Client


def create_vault(sb: Client, user_id: str, name: str, description: str = "") -> dict:
    result = sb.table("vaults").insert({
        "user_id": user_id,
        "name": name.strip(),
        "description": description.strip(),
    }).execute()
    return result.data[0]


def list_vaults(sb: Client, user_id: str) -> list[dict]:
    result = (
        sb.table("vaults")
        .select("*")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
    )
    return result.data or []


def get_vault(sb: Client, vault_id: str, user_id: str) -> dict | None:
    result = (
        sb.table("vaults")
        .select("*")
        .eq("id", vault_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    return result.data


def update_vault(sb: Client, vault_id: str, user_id: str, updates: dict) -> dict | None:
    allowed = {"name", "description", "vault_prompt", "link_types", "fingerprint"}
    clean = {k: v for k, v in updates.items() if k in allowed}
    if not clean:
        return get_vault(sb, vault_id, user_id)
    result = (
        sb.table("vaults")
        .update(clean)
        .eq("id", vault_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0] if result.data else None


def delete_vault(sb: Client, vault_id: str, user_id: str) -> bool:
    result = (
        sb.table("vaults")
        .delete()
        .eq("id", vault_id)
        .eq("user_id", user_id)
        .execute()
    )
    return len(result.data) > 0
