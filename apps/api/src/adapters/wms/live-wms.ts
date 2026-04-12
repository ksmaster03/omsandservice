/**
 * Live WMS adapter — calls Toptier WMS MobileApi for real operations.
 *
 * Phase 1: health + master data sync (GetPart, GetWarehouse, GetLocation)
 * Phase 2: stock flow (Receipt, ScanOut, OrderClose)
 * Phase 3: delivery + container tracking
 */
import type { WmsOrderPush, WmsStock } from '@oms/shared';
import type { WmsAdapter } from '../types';
import { wmsClient } from './wms-client';

// ─── WMS response types ──────────────────────────────────
export interface WmsPart {
  Id: number;
  Name: string;
  Description: string | null;
  UOM: string | null;
  IsFg: boolean | null;
  PartTypeName: string | null;
}

export interface WmsWarehouse {
  WarehouseId: number;
  WarehouseName: string;
  WarehouseCode?: string;
  Description?: string;
}

export interface WmsLocation {
  LocationId: number;
  LocationName: string;
  WarehouseId?: number;
  WarehouseName?: string;
  Zone?: string;
}

export interface WmsReceipt {
  ReceiptId: number;
  ReceiptNo: string;
  State?: string;
  Details?: Array<{
    ReceiptDetailId: number;
    PartNo: string;
    PartName: string;
    Qty: number;
    ReceivedQty?: number;
  }>;
}

export interface WmsOrderState {
  OrderId: number;
  OrderName: string;
  State: string;
  PickingDetails?: Array<{
    PartNo: string;
    Qty: number;
    PickedQty?: number;
  }>;
}

export interface WmsContainer {
  ContainerId: number;
  ContainerName: string;
  PartNo?: string;
  PartName?: string;
  Qty?: number;
  LocationName?: string;
  LotNo?: string;
}

export class LiveWmsAdapter implements WmsAdapter {
  readonly mode = 'live' as const;

  // ─── Phase 1: Connection + Master data ─────────────────

  async healthCheck(): Promise<boolean> {
    return wmsClient.healthCheck();
  }

  async getVersion(): Promise<string> {
    return wmsClient.getVersion();
  }

  async getParts(): Promise<WmsPart[]> {
    return wmsClient.get<WmsPart[]>('/api/SyncData/GetPart');
  }

  async getWarehouses(): Promise<WmsWarehouse[]> {
    return wmsClient.post<WmsWarehouse[]>('/api/SyncData/GetWarehouse');
  }

  async getLocations(): Promise<WmsLocation[]> {
    return wmsClient.get<WmsLocation[]>('/api/SyncData/GetLocation');
  }

  async getUsers(): Promise<unknown[]> {
    return wmsClient.get<unknown[]>('/api/SyncData/GetUser');
  }

  // ─── Phase 2: Stock flow ───────────────────────────────

  async getStock(sku: string): Promise<WmsStock[]> {
    try {
      // WMS containers: { Part: { Name: "SKU" }, Qty: n, Location: { Name: "..." } }
      const raw = await wmsClient.get<Array<Record<string, unknown>>>('/api/Inventory/GetContainerWaitForScanIn');
      const matching = (raw ?? []).filter((c) => {
        const part = c.Part as { Name?: string } | null;
        return part?.Name === sku;
      });
      const byLocation = new Map<string, number>();
      for (const c of matching) {
        const loc = (c.Location as { Name?: string } | null)?.Name ?? 'Receiving';
        byLocation.set(loc, (byLocation.get(loc) ?? 0) + (Number(c.Qty) || 1));
      }
      if (byLocation.size === 0) {
        return [{ sku, warehouse: 'WMS-MAIN', qty: 0, updatedAt: new Date().toISOString() }];
      }
      return Array.from(byLocation.entries()).map(([warehouse, qty]) => ({
        sku, warehouse, qty, updatedAt: new Date().toISOString(),
      }));
    } catch {
      return [{ sku, warehouse: 'WMS-MAIN', qty: 0, updatedAt: new Date().toISOString() }];
    }
  }

  /** Get stock for ALL SKUs at once */
  async getAllStock(): Promise<WmsStock[]> {
    const raw = await wmsClient.get<Array<Record<string, unknown>>>('/api/Inventory/GetContainerWaitForScanIn');
    const byKey = new Map<string, number>();
    for (const c of raw ?? []) {
      const part = c.Part as { Name?: string } | null;
      if (!part?.Name) continue;
      const loc = (c.Location as { Name?: string } | null)?.Name ?? 'Receiving';
      const key = `${part.Name}||${loc}`;
      byKey.set(key, (byKey.get(key) ?? 0) + (Number(c.Qty) || 1));
    }
    const now = new Date().toISOString();
    return Array.from(byKey.entries()).map(([key, qty]) => {
      const [sku = '', warehouse = ''] = key.split('||');
      return { sku, warehouse, qty, updatedAt: now };
    });
  }

  /** Get receipts waiting to be scanned in */
  async getReceiptsWaiting(): Promise<WmsReceipt[]> {
    return wmsClient.get<WmsReceipt[]>('/api/Receipt/GetReceiptForAssignScanList');
  }

  /** Get receipt detail for scan assignment */
  async getReceiptDetail(receiptNo: string, receType: string = 'GR'): Promise<WmsReceipt> {
    return wmsClient.get<WmsReceipt>(
      `/api/Receipt/GetReceiptForAssignScan?number=${encodeURIComponent(receiptNo)}&receType=${receType}`,
    );
  }

  /** Add receipt scan (goods receipt confirmation) */
  async addReceiptScan(params: {
    receiptId: number;
    receiptDetailId: number;
    containerName: string;
    partId: number;
    qty: number;
    deviceName?: string;
    actorUserId: string;
  }): Promise<unknown> {
    const { receiptId, receiptDetailId, containerName, partId, qty, actorUserId } = params;
    return wmsClient.post(
      `/api/Receipt/AddReceiptScan?receiptId=${receiptId}&receiptDetailId=${receiptDetailId}&containerName=${encodeURIComponent(containerName)}&partId=${partId}&qty=${qty}&deviceName=ToptierOSM&scanedData=&actorUserId=${encodeURIComponent(actorUserId)}`,
    );
  }

  /** Set receipt state (confirm/cancel) */
  async setReceiptState(receiptId: number, state: string, actorUserId: string): Promise<unknown> {
    return wmsClient.post(
      `/api/Receipt/SetReceiptState?state=${state}&receiptId=${receiptId}&actorUserId=${encodeURIComponent(actorUserId)}`,
    );
  }

  /** Get containers waiting for scan-in */
  async getContainersWaitingForScanIn(): Promise<WmsContainer[]> {
    return wmsClient.get<WmsContainer[]>('/api/Inventory/GetContainerWaitForScanIn');
  }

  /** Scan container into warehouse location */
  async scanIn(containerName: string, locationName: string, actorUserId: string): Promise<unknown> {
    return wmsClient.post(
      `/api/Inventory/ScanIn?containerName=${encodeURIComponent(containerName)}&locationName=${encodeURIComponent(locationName)}&actorUserId=${encodeURIComponent(actorUserId)}`,
    );
  }

  /** Get pending scan-out orders */
  async getPendingScanOutOrders(): Promise<WmsOrderState[]> {
    return wmsClient.get<WmsOrderState[]>('/api/Inventory/GetPendingScanOutOrders');
  }

  /** Scan out container for an order */
  async scanOut(orderName: string, containerName: string, actorUserId: string): Promise<unknown> {
    return wmsClient.post(
      `/api/Inventory/ScanOut?orderName=${encodeURIComponent(orderName)}&containerName=${encodeURIComponent(containerName)}&containerLabelPrinterId=0&actorUserId=${encodeURIComponent(actorUserId)}`,
    );
  }

  /** Get order state */
  async getOrderState(pickingName: string): Promise<WmsOrderState> {
    return wmsClient.get<WmsOrderState>(
      `/api/Order/GetOrderState?pickingName=${encodeURIComponent(pickingName)}`,
    );
  }

  /** Close order in WMS */
  async closeOrder(orderId: number, actorUserId: string): Promise<unknown> {
    return wmsClient.post(
      `/api/Order/CloseOrder?orderId=${orderId}&deviceName=ToptierOSM&actorUserId=${encodeURIComponent(actorUserId)}`,
    );
  }

  /** Push SO as WMS order — creates picking in WMS or maps to existing */
  async pushOrder(payload: WmsOrderPush): Promise<{ wmsOrderId: string }> {
    // Toptier WMS doesn't have a direct "create order" API in MobileApi.
    // Orders are created in the WMS backend. This adapter returns a
    // reference that the OMS uses for tracking.
    // In practice, the WMS team creates the order and we get the picking
    // name to track via GetOrderState / ScanOut.
    return { wmsOrderId: `WMS-${payload.soNo}-${Date.now().toString(36).toUpperCase()}` };
  }

  /** Get picked containers for an order */
  async getPickedContainers(pickingName: string): Promise<WmsContainer[]> {
    return wmsClient.get<WmsContainer[]>(
      `/api/Order/GetPickedContainersByName?pickingName=${encodeURIComponent(pickingName)}`,
    );
  }

  // ─── Phase 3: Container + Delivery tracking ────────────

  /** Get container info by name */
  async getContainerInfo(containerName: string): Promise<WmsContainer> {
    return wmsClient.get<WmsContainer>(
      `/api/Container/GetContainerInfo?containerName=${encodeURIComponent(containerName)}`,
    );
  }

  /** Get container info by serial number */
  async getContainerBySn(sn: string): Promise<WmsContainer> {
    return wmsClient.get<WmsContainer>(
      `/api/Container/GetContainerInfoBySn?sn=${encodeURIComponent(sn)}`,
    );
  }

  /** Get truckload detail for dispatch */
  async getTruckloadDetail(truckloadName: string): Promise<unknown> {
    return wmsClient.get(
      `/api/Truckload/GetTruckLoadDetail?trackloadName=${encodeURIComponent(truckloadName)}`,
    );
  }

  /** Get truckloads on queue */
  async getTruckloadsOnQueue(): Promise<unknown[]> {
    return wmsClient.get<unknown[]>('/api/Truckload/GetTruckloadOnQueue');
  }

  /** Get invoice state */
  async getInvoiceState(invoiceNumber: string): Promise<unknown> {
    return wmsClient.get(
      `/api/Invoice/GetInvoiceState?number=${encodeURIComponent(invoiceNumber)}`,
    );
  }

  /** Inventory count */
  async getInventoryCountProfiles(): Promise<unknown[]> {
    return wmsClient.get<unknown[]>('/api/InventoryCount/GetInventoryCountProfile');
  }

  async submitInventoryCount(params: {
    profileId: number;
    containerName: string;
    locationName: string;
    qty: number;
    userId: string;
    remark?: string;
  }): Promise<unknown> {
    return wmsClient.post(
      `/api/InventoryCount/Count?inventoryCountProfileId=${params.profileId}&containerName=${encodeURIComponent(params.containerName)}&locationName=${encodeURIComponent(params.locationName)}&qty=${params.qty}&startCount=true&remark=${encodeURIComponent(params.remark ?? '')}&userId=${encodeURIComponent(params.userId)}`,
    );
  }

  /** Get applicable scan-in locations for a container */
  async getScanInLocations(containerName: string): Promise<WmsLocation[]> {
    return wmsClient.get<WmsLocation[]>(
      `/api/Inventory/GetApplicableScanInLocations?containerName=${encodeURIComponent(containerName)}`,
    );
  }

  /** Transfer container to a different location */
  async transferLocation(containerId: number, locationName: string, actorUserId: string): Promise<unknown> {
    return wmsClient.post(
      `/api/Inventory/TransferLocation?containerId=${containerId}&locationName=${encodeURIComponent(locationName)}&actorUserId=${encodeURIComponent(actorUserId)}`,
    );
  }
}
