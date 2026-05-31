import {
  Stack,
  Title,
  Text,
  Flex,
  Button,
  TextInput,
} from "@mantine/core";

import LogSection from "./elements/LogSection";
import { CogneeInstance } from "@/modules/instances/types";
import { tokens } from "@/ui/theme/tokens";
import { useCallback, useState, KeyboardEvent } from "react";
import { Dropzone } from "@mantine/dropzone";
import addData, { addUrlData } from "@/modules/ingestion/addData";
import { librarianIngest } from "@/modules/ingestion/librarianIngest";
import { useToggle } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { trackEvent } from "@/modules/analytics";

interface DatasetAddWidgetProps {
  selectedDatasetId: string | null;
  refreshDatasets: () => Promise<unknown>;
  instance: CogneeInstance;
  onCognifyStart?: () => void;
  onCognifyComplete?: () => void;
  customPrompt?: string;
  llmModel?: string;
  activeGraphModelSchema?: object;
  activePromptName?: string;
}

export default function DatasetAddWidget({
  selectedDatasetId,
  refreshDatasets,
  instance,
  onCognifyStart,
  onCognifyComplete,
  customPrompt,
  llmModel,
  activeGraphModelSchema,
  activePromptName,
}: DatasetAddWidgetProps) {
  const [uploadedFiles, setUploadedFiles] = useState<Map<string, Array<File>>>(
    new Map(),
  );
  const [uploadingInProgress, setUploadingInProgress] = useState<boolean>(false);
  const [librarianPath, setLibrarianPath] = useState<string>("");
  const [librarianBusy, setLibrarianBusy] = useState<boolean>(false);
  const [librarianResult, setLibrarianResult] = useState<string | null>(null);

  const handleAddFiles = useCallback(
    (payload: File[] | null) => {
      setUploadingInProgress(true);
      if (payload === null || selectedDatasetId === null) {
        setUploadingInProgress(false);
        return;
      }
      setUploadedFiles((prevMap) => {
        const newFileMap = new Map(prevMap);
        const existingFiles = newFileMap.get(selectedDatasetId) || [];
        newFileMap.set(selectedDatasetId, [...existingFiles, ...payload]);
        return newFileMap;
      });
      trackEvent({
        pageName: "Dashboard",
        eventName: "upload_data",
        additionalProperties: {
          type: "file",
          file_count: String(payload.length),
          dataset_id: selectedDatasetId,
        },
      });
      setUploadingInProgress(false);
    },
    [selectedDatasetId],
  );

  const removeFile = (key: string) => {
    setUploadedFiles((prevMap) => {
      const newMap = new Map(prevMap);
      newMap.delete(key);
      return newMap;
    });
  };

  const [addingFiles, toggleAddingFiles] = useToggle();

  const addFilesToDataset = useCallback(() => {
    if (selectedDatasetId === null) return;
    trackEvent({
      pageName: "Dashboard",
      eventName: "add_data",
      additionalProperties: { type: "file", dataset_id: selectedDatasetId },
    });
    toggleAddingFiles();
    onCognifyStart?.();
    addData(
      { id: selectedDatasetId },
      uploadedFiles.get(selectedDatasetId) ?? [],
      instance,
    )
      .then(({ dataset_id, dataset_name }) => {
        trackEvent({ pageName: "Dashboard", eventName: "files_uploaded", additionalProperties: { dataset_id, dataset_name, file_count: String(uploadedFiles.get(selectedDatasetId)?.length ?? 0) } });
        refreshDatasets();
        removeFile(selectedDatasetId);
        toggleAddingFiles();
        notifications.show({
          title: "Batch submitted to Librarian",
          message: "Watch the Activity page for progress.",
          color: "green",
        });
        onCognifyComplete?.();
      })
      .catch((err) => {
        toggleAddingFiles();
        onCognifyComplete?.();
        const is429 = err instanceof Error && err.message.includes("Another batch is in progress");
        notifications.show({
          title: is429 ? "Batch already running" : "Failed to submit batch",
          message: err instanceof Error ? err.message : String(err),
          color: is429 ? "yellow" : "red",
        });
      });
  }, [instance, refreshDatasets, selectedDatasetId, toggleAddingFiles, uploadedFiles, onCognifyStart, onCognifyComplete]);

  const [showImportUrl, toggleShowImportUrl] = useToggle();
  const [importUrl, setImportUrl] = useState<string>("");

  const importUrlOnEnterKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") importUrlToDataset();
  };

  const importUrlToDataset = useCallback(() => {
    if (selectedDatasetId === null) return;
    trackEvent({
      pageName: "Dashboard",
      eventName: "upload_data",
      additionalProperties: { type: "text", dataset_id: selectedDatasetId },
    });
    trackEvent({
      pageName: "Dashboard",
      eventName: "add_data",
      additionalProperties: { type: "text", dataset_id: selectedDatasetId },
    });
    toggleAddingFiles();
    onCognifyStart?.();
    addUrlData({ id: selectedDatasetId }, importUrl, instance)
      .then(({ dataset_id, dataset_name }) => {
        trackEvent({ pageName: "Dashboard", eventName: "url_ingested", additionalProperties: { dataset_id, dataset_name } });
        refreshDatasets();
        setImportUrl("");
        toggleAddingFiles();
        notifications.show({
          title: "Batch submitted to Librarian",
          message: "Watch the Activity page for progress.",
          color: "green",
        });
        onCognifyComplete?.();
      })
      .catch((err) => {
        toggleAddingFiles();
        onCognifyComplete?.();
        const is429 = err instanceof Error && err.message.includes("Another batch is in progress");
        notifications.show({
          title: is429 ? "Batch already running" : "Failed to submit batch",
          message: err instanceof Error ? err.message : String(err),
          color: is429 ? "yellow" : "red",
        });
      });
  }, [importUrl, instance, refreshDatasets, selectedDatasetId, toggleAddingFiles, onCognifyStart, onCognifyComplete]);

  const handleLibrarianIngest = useCallback(async () => {
    if (!selectedDatasetId || !librarianPath.trim()) return;
    setLibrarianBusy(true);
    setLibrarianResult(null);
    try {
      const result = await librarianIngest(librarianPath.trim(), selectedDatasetId);
      if (result.status === "ok") {
        setLibrarianResult(
          `classified as ${result.classified_as} (${result.classifier_confidence}); ` +
          `${result.chunks_dispatched} chunks → cognee=${result.engines?.cognee?.written ?? 0}, ` +
          `fbrain=${result.engines?.fbrain?.written ?? 0}`,
        );
        notifications.show({
          title: "Ingest submitted",
          message: `Classified as ${result.classified_as} — run_id ${result.run_id}`,
          color: "green",
        });
        trackEvent({
          pageName: "Dashboard",
          eventName: "upload_data",
          additionalProperties: {
            type: "librarian_path",
            classified_as: result.classified_as ?? "unknown",
            dataset_id: selectedDatasetId,
          },
        });
        setLibrarianPath("");
        await refreshDatasets();
      } else {
        setLibrarianResult(`error: ${result.error}`);
        notifications.show({ title: "Ingest failed", message: result.error ?? "", color: "red" });
      }
    } catch (err: any) {
      setLibrarianResult(`error: ${err?.message ?? err}`);
      notifications.show({ title: "Ingest failed", message: String(err), color: "red" });
    } finally {
      setLibrarianBusy(false);
    }
  }, [selectedDatasetId, librarianPath, refreshDatasets]);

  return (
    <Stack
      className="rounded-[0.5rem] px-[2rem] pt-[1.5rem] pb-[1.75rem] !gap-[0]"
      bg="white"
    >
      <Stack className="!gap-[0]" mb="1.25rem">
        <Title size="h2" mb="0.125rem">
          Add data
        </Title>
        <Text c={tokens.textMuted} size="lg">
          Upload documents to extract entities, relationships, and concepts
          into a searchable knowledge graph
        </Text>
      </Stack>

      <Stack mb="1rem">
        <Dropzone
          onDrop={handleAddFiles}
          loading={uploadingInProgress}
          disabled={selectedDatasetId === null}
          opacity={selectedDatasetId === null ? "0.5" : "1"}
        >
          <Flex
            className="justify-center items-center h-[5rem] rounded-[0.5rem]"
            style={{
              backgroundColor: "rgba(92, 16, 244, 0.08)",
              border: "1px dashed rgba(92, 16, 244, 0.4)",
              cursor: selectedDatasetId === null ? "not-allowed" : "pointer",
            }}
          >
            <Text size="md" c="primary2.6" fw={500}>
              ↑ Drop files here or browse
            </Text>
          </Flex>
        </Dropzone>

        <Flex gap="0.625rem">
          <Flex
            flex="1"
            className="justify-center items-center h-[2.5rem] border rounded-[0.5rem] border-[#757470]"
            onClick={() => toggleShowImportUrl()}
            opacity={selectedDatasetId === null ? "0.5" : "1"}
            style={{ cursor: selectedDatasetId === null ? "not-allowed" : "pointer" }}
          >
            <Text size="md" c="secondary3.7">
              Add text
            </Text>
          </Flex>
          <Flex
            flex="1"
            className="justify-center items-center h-[2.5rem] border rounded-[0.5rem] border-secondary-3"
            opacity="0.5"
            style={{ cursor: "not-allowed" }}
          >
            <Text size="md" c="secondary3.2">
              Connect storage
            </Text>
          </Flex>
        </Flex>
      </Stack>

      {selectedDatasetId !== null &&
        ((uploadedFiles.get(selectedDatasetId)?.length ?? 0) > 0 ||
          (showImportUrl && importUrl !== "")) && (
          <LogSection
            items={[
              ...(uploadedFiles.get(selectedDatasetId)?.map(({ name }) => name) ?? []),
              ...(showImportUrl && importUrl !== "" ? [importUrl] : []),
            ]}
          />
        )}

      {selectedDatasetId !== null && showImportUrl && (
        <TextInput
          disabled={addingFiles}
          placeholder="Paste or enter text"
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
          onKeyDown={importUrlOnEnterKeyDown}
        />
      )}

      <Button
        disabled={
          (importUrl === "" &&
            (selectedDatasetId === null ||
              uploadedFiles.get(selectedDatasetId) === undefined)) ||
          addingFiles
        }
        color="primary2.6"
        mt="1rem"
        onClick={showImportUrl && importUrl !== "" ? importUrlToDataset : addFilesToDataset}
      >
        Add data
      </Button>

      {selectedDatasetId && (
        <Stack gap="xs" mt="md">
          <Title order={5}>Add by path / URL (Librarian)</Title>
          <Text size="xs" c="dimmed">
            Local folder, file path, URL, or DB connection string (e.g. <code>sqlite:///path/to.db</code>,
            <code> /Users/me/kb</code>, <code>https://…</code>). Librarian routes it to cognee or fbrain.
          </Text>
          <Flex gap="xs">
            <TextInput
              placeholder="/Users/me/netsuite-kb or sqlite:///data.db or https://…"
              value={librarianPath}
              onChange={(e) => setLibrarianPath(e.currentTarget.value)}
              disabled={librarianBusy}
              style={{ flex: 1 }}
            />
            <Button
              onClick={handleLibrarianIngest}
              loading={librarianBusy}
              disabled={!librarianPath.trim() || !selectedDatasetId}
            >
              Ingest
            </Button>
          </Flex>
          {librarianResult && (
            <Text size="xs" c={librarianResult.startsWith("error") ? "red" : "green"}>
              {librarianResult}
            </Text>
          )}
        </Stack>
      )}
    </Stack>
  );
}
