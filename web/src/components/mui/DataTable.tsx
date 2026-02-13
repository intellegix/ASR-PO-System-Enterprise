'use client';

import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';

interface DataTableProps<T extends Record<string, unknown>> {
  rows: T[];
  columns: GridColDef[];
  loading?: boolean;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  toolbar?: boolean;
  autoHeight?: boolean;
  density?: 'compact' | 'standard' | 'comfortable';
}

/**
 * Generic data table component built on MUI DataGrid.
 * Pre-configured with sorting, filtering, and pagination.
 */
export const DataTable = <T extends Record<string, unknown>>({
  rows,
  columns,
  loading = false,
  pageSize = 25,
  onRowClick,
  getRowId,
  toolbar = true,
  autoHeight = false,
  density = 'standard',
}: DataTableProps<T>) => {
  return (
    <DataGrid
      rows={rows}
      columns={columns}
      loading={loading}
      getRowId={getRowId}
      onRowClick={(params) => {
        if (onRowClick) {
          onRowClick(params.row as T);
        }
      }}
      initialState={{
        pagination: {
          paginationModel: {
            pageSize,
          },
        },
      }}
      pageSizeOptions={[10, 25, 50, 100]}
      slots={{
        toolbar: toolbar ? GridToolbar : undefined,
      }}
      slotProps={{
        toolbar: {
          showQuickFilter: toolbar,
          quickFilterProps: { debounceMs: 500 },
        },
      }}
      autoHeight={autoHeight}
      density={density}
      disableRowSelectionOnClick
      sx={{
        '& .MuiDataGrid-cell:focus': {
          outline: 'none',
        },
        '& .MuiDataGrid-row:hover': {
          cursor: onRowClick ? 'pointer' : 'default',
        },
      }}
    />
  );
};
