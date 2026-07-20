import { useState, useEffect, useCallback } from "react";
import { notesApi, Note } from "@/lib/api";

export const useNotes = (tripId: string | null | undefined) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!tripId) {
      setNotes([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data } = await notesApi.list(tripId);
      setNotes(data.notes);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch notes:", err);
      setError("無法載入記事，請稍後再試");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = useCallback(
    async (data: {
      title: string;
      content?: string;
      sourceUrl?: string;
      images?: string[];
    }) => {
      if (!tripId) throw new Error("tripId is required");
      const { data: res } = await notesApi.create(tripId, data);
      setNotes((prev) => [res.note, ...prev]);
      return res.note;
    },
    [tripId]
  );

  const updateNote = useCallback(async (id: string, data: Partial<Note>) => {
    const { data: res } = await notesApi.update(id, data);
    setNotes((prev) => prev.map((n) => (n.id === id ? res.note : n)));
    return res.note;
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    await notesApi.delete(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return {
    notes,
    loading,
    error,
    refetch: fetchNotes,
    createNote,
    updateNote,
    deleteNote,
  };
};
