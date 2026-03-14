import { useState, useEffect } from "react";
import type { User } from "@/types";

export function useTeamMembers() {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { members, loading };
}
