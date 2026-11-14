import { Account, LeadStage } from "@/types";

const ORDER_STEP = 1000;
const MIN_ORDER_GAP = 0.001;

export type DropPosition = "before" | "after";

export interface DropTarget {
  cardId: string;
  position: DropPosition;
}

export interface KanbanOrderUpdate {
  id: string;
  cnpj: string;
  estagio?: LeadStage;
  kanban_order: number;
}

function hasValidOrder(order: number | undefined | null): order is number {
  return typeof order === "number" && Number.isFinite(order);
}

/**
 * Sorts leads within a single Kanban column by `kanban_order` ascending.
 * Leads without an explicit `kanban_order` are placed after ordered leads,
 * preserving their relative order.
 */
export function sortStageLeads(leads: Account[]): Account[] {
  return [...leads].sort((a, b) => {
    const aHas = hasValidOrder(a.kanban_order);
    const bHas = hasValidOrder(b.kanban_order);

    if (aHas && bHas) {
      return (a.kanban_order as number) - (b.kanban_order as number);
    }
    if (aHas) return -1;
    if (bHas) return 1;
    return 0;
  });
}

/**
 * Computes the minimal set of `kanban_order` (and `estagio`) updates needed
 * when dropping `draggedAccount` into `targetStage` at `dropTarget` (or end of column).
 */
export function computeDropOrderUpdates(params: {
  draggedAccount: Account;
  targetStage: LeadStage;
  targetStageLeads: Account[];
  dropTarget?: DropTarget | null;
}): KanbanOrderUpdate[] {
  const { draggedAccount, targetStage, targetStageLeads, dropTarget } = params;
  const sorted = sortStageLeads(targetStageLeads);
  const withoutDragged = sorted.filter((l) => l.id !== draggedAccount.id);

  let insertIndex = withoutDragged.length;
  if (dropTarget) {
    const targetIdx = withoutDragged.findIndex((l) => l.id === dropTarget.cardId);
    if (targetIdx !== -1) {
      insertIndex = dropTarget.position === "before" ? targetIdx : targetIdx + 1;
    }
  }

  const stageChanged = draggedAccount.estagio !== targetStage;

  // Check if dropping in the exact same position within the same column
  if (!stageChanged) {
    const currentIndex = sorted.findIndex((l) => l.id === draggedAccount.id);
    if (currentIndex === insertIndex && hasValidOrder(draggedAccount.kanban_order)) {
      return [];
    }
  }

  const prevLead = insertIndex > 0 ? withoutDragged[insertIndex - 1] : undefined;
  const nextLead = insertIndex < withoutDragged.length ? withoutDragged[insertIndex] : undefined;

  const canUseMidpoint =
    (!prevLead || hasValidOrder(prevLead.kanban_order)) &&
    (!nextLead || hasValidOrder(nextLead.kanban_order));

  if (canUseMidpoint) {
    const prevOrder = prevLead?.kanban_order;
    const nextOrder = nextLead?.kanban_order;

    let newOrder: number | null = null;
    if (prevOrder === undefined && nextOrder === undefined) {
      newOrder = ORDER_STEP;
    } else if (prevOrder === undefined && nextOrder !== undefined) {
      newOrder = nextOrder - ORDER_STEP;
    } else if (prevOrder !== undefined && nextOrder === undefined) {
      newOrder = prevOrder + ORDER_STEP;
    } else if (prevOrder !== undefined && nextOrder !== undefined && nextOrder - prevOrder >= MIN_ORDER_GAP) {
      newOrder = (prevOrder + nextOrder) / 2;
    }

    if (newOrder !== null) {
      return [
        {
          id: draggedAccount.id,
          cnpj: draggedAccount.cnpj,
          ...(stageChanged ? { estagio: targetStage } : {}),
          kanban_order: newOrder,
        },
      ];
    }
  }

  // Fallback: rebalance all cards in the target column with clean spacing
  const rebalanced = [
    ...withoutDragged.slice(0, insertIndex),
    draggedAccount,
    ...withoutDragged.slice(insertIndex),
  ];

  const updates: KanbanOrderUpdate[] = [];
  rebalanced.forEach((lead, index) => {
    const nextOrder = (index + 1) * ORDER_STEP;
    const isDragged = lead.id === draggedAccount.id;
    if (lead.kanban_order !== nextOrder || (isDragged && stageChanged)) {
      updates.push({
        id: lead.id,
        cnpj: lead.cnpj,
        ...(isDragged && stageChanged ? { estagio: targetStage } : {}),
        kanban_order: nextOrder,
      });
    }
  });

  return updates;
}
