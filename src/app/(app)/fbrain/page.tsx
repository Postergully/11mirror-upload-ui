"use client";

import { useEffect, useState } from "react";
import { Title, Stack, Text, Loader, Card, Group, Badge } from "@mantine/core";
import { listFbrainPages } from "@/modules/librarian/client";

type Page = {
  slug: string;
  title: string;
  source?: string;
  updated_at?: string;
  snippet?: string;
};

export default function FbrainPage() {
  const [pages, setPages] = useState<Page[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listFbrainPages(50)
      .then((body) => setPages(body.pages || []))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <Text c="red">{error}</Text>;
  if (!pages) return <Loader />;
  if (pages.length === 0) return <Text>No pages yet. Upload one from the Datasets tab.</Text>;

  return (
    <Stack>
      <Title order={2}>Fbrain pages</Title>
      <Text size="sm" c="dimmed">
        Shared workspace — every upload.prod user sees the same list. Per-user scoping is on the roadmap (TODO 6).
      </Text>
      {pages.map((p) => (
        <Card key={p.slug} withBorder shadow="xs">
          <Group justify="space-between">
            <div>
              <Text fw={600}>{p.title}</Text>
              <Text size="xs" c="dimmed">{p.slug}</Text>
            </div>
            {p.source && <Badge>{p.source}</Badge>}
          </Group>
          {p.snippet && <Text size="sm" mt="xs" lineClamp={2}>{p.snippet}</Text>}
        </Card>
      ))}
    </Stack>
  );
}
