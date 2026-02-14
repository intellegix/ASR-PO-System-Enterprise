'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PhoneLink } from '@/components/ui/PhoneLink';
import AppLayout from '@/components/layout/AppLayout';
import ReceiptScanner from '@/components/po/ReceiptScanner';
import { PONumberDisplay, PONumberLegend } from '@/components/mui';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';

// Interfaces for completion form
interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  vendor_type: string;
  payment_terms_default: string | null;
}

interface GLAccount {
  id: string;
  gl_code_short: string;
  gl_account_number: string;
  gl_account_name: string;
  is_taxable_default: boolean;
}

interface NewLineItem {
  id: string;
  itemDescription: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  glAccountId: string;
  glAccountName?: string;
  isTaxable: boolean;
}

interface LineItem {
  id: string;
  line_number: number;
  item_description: string;
  quantity: string | number;
  unit_of_measure: string;
  unit_price: string | number;
  line_subtotal: string | number;
  is_taxable: boolean;
  status: string;
  gl_accounts: {
    gl_code_short: string;
    gl_account_name: string;
  } | null;
}

interface AuditEntry {
  id: string;
  action: string;
  timestamp: string;
  notes: string | null;
  status_before: string | null;
  status_after: string;
  created_by: string | null;
  authorized_by: string | null;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  division_id: string;
  description: string;
  requested_by: string;
  authorized_by: string | null;
  vendor_id: string | null;
  total_amount: string | number;
  subtotal_amount: string | number;
  priority: string;
  status: string;
  project_id: string | null;
  department_id: string | null;
  gl_account_id: string | null;
  notes: string | null;
  delivery_date: string | null;
  attachments: string | null;
  is_taxable: boolean;
  tax_rate: string | number;
  tax_amount: string | number;
  shipping_amount: string | number;
  total_with_tax: string | number;
  created_at: string;
  updated_at: string;
  line_items: LineItem[];
  audit_log: AuditEntry[];
  client?: {
    client_name: string;
    category: string | null;
  } | null;
  vendor?: {
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  project?: {
    project_name: string;
  } | null;
  division?: {
    division_name: string;
  } | null;
}

const STATUS_CHIP_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'error',
  draft: 'default',
  submitted: 'warning',
  issued: 'info',
  received: 'info',
  invoiced: 'info',
  paid: 'success',
  cancelled: 'default',
};

function ViewPurchaseOrder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Phase 2 completion form state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [glAccounts, setGLAccounts] = useState<GLAccount[]>([]);
  const [completionVendorId, setCompletionVendorId] = useState('');
  const [completionVendorSearch, setCompletionVendorSearch] = useState('');
  const [completionLineItems, setCompletionLineItems] = useState<NewLineItem[]>([]);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionVendorNotes, setCompletionVendorNotes] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUOM, setNewItemUOM] = useState('EA');
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemGLId, setNewItemGLId] = useState('');
  const [newItemTaxable, setNewItemTaxable] = useState(true);
  const [completionSubmitting, setCompletionSubmitting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [receiptScanned, setReceiptScanned] = useState(false);

  // Get ID from URL parameters instead of route parameters
  const id = searchParams.get('id');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && id) {
      fetchPurchaseOrder(id);
    }
  }, [status, id, router]);

  const fetchPurchaseOrder = async (poId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/po/${poId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch purchase order: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Normalize API response to match component interface
      const reqUser = data.users_po_headers_requested_by_user_idTousers;
      const appUser = data.users_po_headers_approved_by_user_idTousers;
      const normalized: PurchaseOrder = {
        ...data,
        description: data.notes_internal || '',
        requested_by: reqUser ? `${reqUser.first_name} ${reqUser.last_name}` : '',
        authorized_by: appUser ? `${appUser.first_name} ${appUser.last_name}` : null,
        priority: data.priority || '',
        notes: data.notes_vendor || data.notes_internal || null,
        is_taxable: Number(data.tax_amount) > 0,
        shipping_amount: 0,
        total_with_tax: data.total_amount,
        line_items: (data.po_line_items || []).map((li: {
          id: string;
          line_number: number;
          item_description: string;
          quantity: string | number;
          unit_of_measure: string;
          unit_price: string | number;
          line_subtotal: string | number;
          is_taxable: boolean;
          status: string;
          gl_accounts?: { gl_code_short: string; gl_account_name: string } | null;
          gl_account_code?: string | null;
          gl_account_name?: string | null;
        }) => ({
          ...li,
          gl_accounts: li.gl_accounts || (li.gl_account_code ? {
            gl_code_short: li.gl_account_code,
            gl_account_name: li.gl_account_name || '',
          } : null),
        })),
        audit_log: (data.po_approvals || []).map((a: {
          id: string;
          action: string;
          timestamp: string;
          notes: string | null;
          status_before: string | null;
          status_after: string;
          users?: { first_name: string; last_name: string } | null;
          actor_user?: { first_name: string; last_name: string } | null;
        }) => ({
          id: a.id,
          action: a.action,
          timestamp: a.timestamp,
          notes: a.notes,
          status_before: a.status_before,
          status_after: a.status_after,
          created_by: (a.users || a.actor_user)?.first_name ? `${(a.users || a.actor_user)!.first_name} ${(a.users || a.actor_user)!.last_name}` : null,
          authorized_by: null,
        })),
        client: data.clients ? {
          client_name: data.clients.client_name,
          category: data.clients.category || null,
        } : null,
        vendor: data.vendors ? {
          name: data.vendors.vendor_name,
          contact_person: data.vendors.contact_name || null,
          phone: data.vendors.contact_phone || data.vendors.phone_main || null,
          email: data.vendors.contact_email || null,
        } : null,
        project: data.projects ? {
          project_name: `${data.projects.project_code} - ${data.projects.project_name}`,
        } : null,
        division: data.divisions ? {
          division_name: data.divisions.division_name,
        } : null,
      };
      setPo(normalized);
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      setError(error instanceof Error ? error.message : 'Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  // Fetch vendors and GL accounts if PO is incomplete draft
  useEffect(() => {
    if (po && po.status === 'Draft' && !po.vendor_id) {
      const fetchCompletionData = async () => {
        try {
          const [vendorRes, glRes] = await Promise.all([
            fetch('/api/vendors'),
            fetch('/api/gl-accounts'),
          ]);
          if (vendorRes.ok) setVendors(await vendorRes.json());
          if (glRes.ok) setGLAccounts(await glRes.json());
        } catch (err) {
          console.error('Error fetching completion data:', err);
        }
      };
      fetchCompletionData();
    }
  }, [po]);

  const isIncompleteDraft = po && po.status === 'Draft' && !po.vendor_id;

  const addCompletionLineItem = () => {
    if (!newItemDesc || !newItemGLId || newItemPrice <= 0) return;
    const glAccount = glAccounts.find((g) => g.id === newItemGLId);
    setCompletionLineItems([
      ...completionLineItems,
      {
        id: Date.now().toString(),
        itemDescription: newItemDesc,
        quantity: newItemQty,
        unitOfMeasure: newItemUOM,
        unitPrice: newItemPrice,
        glAccountId: newItemGLId,
        glAccountName: glAccount?.gl_account_name,
        isTaxable: newItemTaxable,
      },
    ]);
    setShowAddItem(false);
    setNewItemDesc('');
    setNewItemQty(1);
    setNewItemUOM('EA');
    setNewItemPrice(0);
    setNewItemGLId('');
    setNewItemTaxable(true);
  };

  const removeCompletionLineItem = (itemId: string) => {
    setCompletionLineItems(completionLineItems.filter((i) => i.id !== itemId));
  };

  const completionSubtotal = completionLineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const completionTaxable = completionLineItems.filter((i) => i.isTaxable).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const completionTax = completionTaxable * 0.0775;
  const completionTotal = completionSubtotal + completionTax;

  const handleCompletePO = async (status: 'Draft' | 'Approved') => {
    if (!id || !completionVendorId || completionLineItems.length === 0) return;
    setCompletionSubmitting(true);
    setCompletionError(null);

    try {
      const res = await fetch(`/api/po/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: completionVendorId,
          lineItems: completionLineItems.map((item) => ({
            itemDescription: item.itemDescription,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure,
            unitPrice: item.unitPrice,
            glAccountId: item.glAccountId,
            isTaxable: item.isTaxable,
          })),
          notesInternal: completionNotes || undefined,
          notesVendor: completionVendorNotes || undefined,
          status,
        }),
      });

      if (res.ok) {
        await fetchPurchaseOrder(id);
        setCompletionLineItems([]);
        setCompletionVendorId('');
      } else {
        const errData = await res.json();
        setCompletionError(errData.error || 'Failed to complete PO');
      }
    } catch (err) {
      console.error('Error completing PO:', err);
      setCompletionError('Network error. Please try again.');
    } finally {
      setCompletionSubmitting(false);
    }
  };

  // Handle receipt scan completion
  interface ScanResult {
    vendor: {
      name: string;
      matchedVendorId: string | null;
    };
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    subtotal?: number;
    taxAmount?: number;
    total: number;
    receiptDate?: string;
    receiptNumber?: string;
    receiptImageUrl?: string;
  }

  const handleScanComplete = (result: ScanResult) => {
    setReceiptScanned(true);
    // Auto-fill vendor
    if (result.vendor.name) {
      setCompletionVendorSearch(result.vendor.name);
      if (result.vendor.matchedVendorId) {
        setCompletionVendorId(result.vendor.matchedVendorId);
      }
    }
    // Auto-fill line items
    if (result.lineItems.length > 0) {
      const defaultGLId = glAccounts.length > 0 ? glAccounts[0].id : '';
      const items = result.lineItems.map((item, i: number) => ({
        id: `scan-${Date.now()}-${i}`,
        itemDescription: item.description,
        quantity: item.quantity,
        unitOfMeasure: 'EA',
        unitPrice: item.unitPrice,
        glAccountId: defaultGLId,
        glAccountName: glAccounts.length > 0 ? glAccounts[0].gl_account_name : undefined,
        isTaxable: true,
      }));
      setCompletionLineItems(items);
    }
  };

  const filteredVendors = vendors.filter((v) => {
    if (!completionVendorSearch) return true;
    const term = completionVendorSearch.toLowerCase();
    return v.vendor_name.toLowerCase().includes(term) || v.vendor_code.toLowerCase().includes(term);
  });

  // Handle approval/rejection actions
  const handleAction = async (action: 'approve' | 'reject', notes?: string) => {
    if (!id) return;

    try {
      const response = await fetch(`/api/po/${id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to process action');
      }

      // Refresh the purchase order data
      await fetchPurchaseOrder(id);
    } catch (error) {
      console.error('Error processing action:', error);
    }
  };

  // Loading skeleton
  if (status === 'loading' || loading) {
    return (
      <AppLayout pageTitle="Loading...">
        <Box sx={{ maxWidth: 960, mx: 'auto' }}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
              <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="50%" height={24} sx={{ mb: 1 }} />
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
            </CardContent>
          </Card>
        </Box>
      </AppLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AppLayout pageTitle="Error">
        <Box sx={{ maxWidth: 960, mx: 'auto' }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Error Loading Purchase Order</Typography>
              <Alert severity="error" sx={{ mb: 3, mx: 'auto', maxWidth: 500 }}>{error}</Alert>
              <Button variant="contained" onClick={() => id && fetchPurchaseOrder(id)}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </Box>
      </AppLayout>
    );
  }

  // No ID
  if (!id) {
    return (
      <AppLayout pageTitle="Invalid PO">
        <Box sx={{ maxWidth: 960, mx: 'auto' }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Invalid Purchase Order</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>No purchase order ID provided</Typography>
              <Button component={Link} href="/po" variant="contained">
                Back to Purchase Orders
              </Button>
            </CardContent>
          </Card>
        </Box>
      </AppLayout>
    );
  }

  // Not found
  if (!po) {
    return (
      <AppLayout pageTitle="Not Found">
        <Box sx={{ maxWidth: 960, mx: 'auto' }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Purchase Order Not Found</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>The requested purchase order could not be found</Typography>
              <Button component={Link} href="/po" variant="contained">
                Back to Purchase Orders
              </Button>
            </CardContent>
          </Card>
        </Box>
      </AppLayout>
    );
  }

  const statusColor = STATUS_CHIP_COLORS[po.status.toLowerCase()] || 'default';
  const canApprove = session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER';
  const isPending = po.status.toLowerCase() === 'pending';

  const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );

  return (
    <AppLayout pageTitle={`PO ${po.po_number}`}>
      <Box data-testid="po-view-page" sx={{ maxWidth: 960, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Header Card */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  Purchase Order #<PONumberDisplay poNumber={po.po_number} size="large" /> <PONumberLegend />
                </Typography>
                {po.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{po.description}</Typography>
                )}
              </Box>
              <Chip
                label={po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                color={statusColor}
                sx={{ fontWeight: 600 }}
              />
            </Box>

            {/* Action buttons for managers/admins */}
            {canApprove && isPending && (
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleOutlineIcon />}
                  onClick={() => handleAction('approve')}
                >
                  Approve
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<CancelOutlinedIcon />}
                  onClick={() => {
                    const notes = prompt('Rejection reason (optional):');
                    handleAction('reject', notes || undefined);
                  }}
                >
                  Reject
                </Button>
              </Box>
            )}

            {/* Purchase Order Details Grid */}
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Order Information</Typography>
                <DetailRow label="Requested By" value={po.requested_by} />
                {po.authorized_by && <DetailRow label="Authorized By" value={po.authorized_by} />}
                {po.client && (
                  <DetailRow
                    label="Client"
                    value={`${po.client.client_name}${po.client.category ? ` (${po.client.category})` : ''}`}
                  />
                )}
                <DetailRow label="Division" value={po.division?.division_name || 'N/A'} />
                <DetailRow label="Project" value={po.project?.project_name || 'N/A'} />
                {po.priority && <DetailRow label="Priority" value={po.priority} />}
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Vendor & Financial</Typography>
                <DetailRow label="Vendor" value={po.vendor?.name || 'TBD'} />
                {po.vendor?.contact_person && <DetailRow label="Contact" value={po.vendor.contact_person} />}
                {po.vendor?.phone && (
                  <DetailRow label="Phone" value={<PhoneLink phone={po.vendor.phone} />} />
                )}
                <DetailRow label="Subtotal" value={`$${Number(po.subtotal_amount).toFixed(2)}`} />
                {po.is_taxable && (
                  <DetailRow label="Tax" value={`$${Number(po.tax_amount).toFixed(2)}`} />
                )}
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Total</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>${Number(po.total_with_tax).toFixed(2)}</Typography>
                </Box>
              </Grid>
            </Grid>

            {po.notes && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Notes</Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">{po.notes}</Typography>
                </Paper>
              </>
            )}
          </CardContent>
        </Card>

        {/* Phase 2 Completion Form — Incomplete Draft */}
        {isIncompleteDraft && (
          <Card>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Alert severity="warning" icon={<WarningAmberIcon />}>
                This PO needs vendor and line item details. Complete the form below.
              </Alert>

              {/* Receipt Scanner */}
              {id && (
                <ReceiptScanner poId={id} onScanComplete={handleScanComplete} />
              )}

              {/* Receipt scanned banner */}
              {receiptScanned && (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  Receipt scanned — review and edit the details below
                </Alert>
              )}

              {completionError && (
                <Alert severity="error">{completionError}</Alert>
              )}

              {/* Vendor Selection */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  Vendor <Typography component="span" color="error.main">*</Typography>
                </Typography>
                <TextField
                  value={completionVendorSearch}
                  onChange={(e) => {
                    setCompletionVendorSearch(e.target.value);
                    if (completionVendorId) setCompletionVendorId('');
                  }}
                  placeholder="Search vendors..."
                  size="small"
                  fullWidth
                  sx={{ mb: 1 }}
                />
                {completionVendorSearch && !completionVendorId && (
                  <Paper variant="outlined" sx={{ maxHeight: 192, overflow: 'auto' }}>
                    {filteredVendors.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>No vendors match</Typography>
                    ) : (
                      filteredVendors.map((v) => (
                        <Box
                          key={v.id}
                          onClick={() => {
                            setCompletionVendorId(v.id);
                            setCompletionVendorSearch(v.vendor_name);
                          }}
                          sx={{
                            px: 1.5,
                            py: 1,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                            borderBottom: 1,
                            borderColor: 'divider',
                            '&:last-child': { borderBottom: 0 },
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {v.vendor_name}
                            <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                              ({v.vendor_code})
                            </Typography>
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Paper>
                )}
                {completionVendorId && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption" color="success.main">Vendor selected</Typography>
                  </Box>
                )}
              </Box>

              {/* Line Items */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Line Items <Typography component="span" color="error.main">*</Typography>
                  </Typography>
                  {!showAddItem && (
                    <Button onClick={() => setShowAddItem(true)} size="small" startIcon={<AddIcon />}>
                      Add Item
                    </Button>
                  )}
                </Box>

                {/* Existing items list */}
                {completionLineItems.length > 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                    {completionLineItems.map((item) => (
                      <Paper
                        key={item.id}
                        variant="outlined"
                        sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>{item.itemDescription}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.quantity} {item.unitOfMeasure} x ${item.unitPrice.toFixed(2)} = ${(item.quantity * item.unitPrice).toFixed(2)}
                            {item.glAccountName && (
                              <Typography component="span" sx={{ ml: 1, color: 'text.disabled' }}>| {item.glAccountName}</Typography>
                            )}
                            {item.isTaxable && (
                              <Typography component="span" sx={{ ml: 1, color: 'warning.dark' }}>Taxable</Typography>
                            )}
                          </Typography>
                        </Box>
                        <IconButton size="small" color="error" onClick={() => removeCompletionLineItem(item.id)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    ))}
                  </Box>
                )}

                {/* Add item form */}
                {showAddItem && (
                  <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Description *"
                      value={newItemDesc}
                      onChange={(e) => setNewItemDesc(e.target.value)}
                      placeholder="e.g., Roofing shingles"
                      size="small"
                      fullWidth
                    />
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField
                          label="Qty"
                          type="number"
                          value={newItemQty}
                          onChange={(e) => setNewItemQty(Number(e.target.value))}
                          size="small"
                          fullWidth
                          slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField
                          label="UOM"
                          value={newItemUOM}
                          onChange={(e) => setNewItemUOM(e.target.value)}
                          select
                          size="small"
                          fullWidth
                        >
                          <MenuItem value="EA">Each</MenuItem>
                          <MenuItem value="LF">Linear Ft</MenuItem>
                          <MenuItem value="SF">Sq Ft</MenuItem>
                          <MenuItem value="HR">Hour</MenuItem>
                          <MenuItem value="LOT">Lot</MenuItem>
                          <MenuItem value="BX">Box</MenuItem>
                          <MenuItem value="CS">Case</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField
                          label="Unit Price *"
                          type="number"
                          value={newItemPrice || ''}
                          onChange={(e) => setNewItemPrice(Number(e.target.value))}
                          placeholder="0.00"
                          size="small"
                          fullWidth
                          slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField
                          label="GL Account *"
                          value={newItemGLId}
                          onChange={(e) => setNewItemGLId(e.target.value)}
                          select
                          size="small"
                          fullWidth
                        >
                          <MenuItem value="">Select...</MenuItem>
                          {glAccounts.map((gl) => (
                            <MenuItem key={gl.id} value={gl.id}>
                              {gl.gl_code_short} - {gl.gl_account_name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    </Grid>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newItemTaxable}
                          onChange={(e) => setNewItemTaxable(e.target.checked)}
                          size="small"
                        />
                      }
                      label={<Typography variant="body2">Taxable (7.75%)</Typography>}
                    />
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Button
                        variant="outlined"
                        color="secondary"
                        size="small"
                        onClick={() => { setShowAddItem(false); setNewItemDesc(''); setNewItemPrice(0); setNewItemGLId(''); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={addCompletionLineItem}
                        disabled={!newItemDesc || !newItemGLId || newItemPrice <= 0}
                      >
                        Add Line Item
                      </Button>
                    </Box>
                  </Paper>
                )}
              </Box>

              {/* Totals */}
              {completionLineItems.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>${completionSubtotal.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Tax (7.75%)</Typography>
                    <Typography variant="body2">${completionTax.toFixed(2)}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Total</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>${completionTotal.toFixed(2)}</Typography>
                  </Box>
                </Paper>
              )}

              {/* Notes */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Internal Notes"
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    multiline
                    rows={3}
                    placeholder="Internal notes..."
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Vendor Notes"
                    value={completionVendorNotes}
                    onChange={(e) => setCompletionVendorNotes(e.target.value)}
                    multiline
                    rows={3}
                    placeholder="Notes for vendor..."
                    size="small"
                    fullWidth
                  />
                </Grid>
              </Grid>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={completionSubmitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  onClick={() => handleCompletePO('Draft')}
                  disabled={completionSubmitting || !completionVendorId || completionLineItems.length === 0}
                  sx={{ flex: 1, py: 1.5 }}
                >
                  {completionSubmitting ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={completionSubmitting ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlineIcon />}
                  onClick={() => handleCompletePO('Approved')}
                  disabled={completionSubmitting || !completionVendorId || completionLineItems.length === 0}
                  sx={{ flex: 1, py: 1.5 }}
                >
                  {completionSubmitting ? 'Approving...' : 'Approve'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Line Items */}
        {po.line_items && po.line_items.length > 0 && (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Line Items</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Qty</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} align="right">Unit Price</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {po.line_items.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>{item.line_number}</TableCell>
                        <TableCell>{item.item_description}</TableCell>
                        <TableCell>{item.quantity} {item.unit_of_measure}</TableCell>
                        <TableCell align="right">${Number(item.unit_price).toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>${Number(item.line_subtotal).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Audit Log */}
        {po.audit_log && po.audit_log.length > 0 && (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Audit Log</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {po.audit_log.map((entry) => (
                  <Box
                    key={entry.id}
                    sx={{ borderLeft: 4, borderColor: 'primary.main', pl: 2, py: 0.5 }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{entry.action}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          by {entry.created_by || 'System'} at {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'N/A'}
                        </Typography>
                        {entry.notes && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {entry.notes}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="caption" color="text.disabled">
                        {entry.status_before} → {entry.status_after}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
          <Button
            component={Link}
            href="/po"
            variant="outlined"
            color="secondary"
            startIcon={<ArrowBackIcon />}
          >
            Back to Purchase Orders
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            className="no-print"
          >
            Print
          </Button>
        </Box>
      </Box>
    </AppLayout>
  );
}

// Wrap with Suspense for useSearchParams() compatibility with static export
export default function ViewPurchaseOrderWrapper() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
          <CircularProgress />
        </Box>
      }
    >
      <ViewPurchaseOrder />
    </Suspense>
  );
}
