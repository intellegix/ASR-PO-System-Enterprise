'use client';

import { Autocomplete, TextField, CircularProgress } from '@mui/material';

interface SearchableSelectProps<T> {
  options: T[];
  value: T | null;
  onChange: (value: T | null) => void;
  getOptionLabel: (option: T) => string;
  label: string;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  required?: boolean;
  noOptionsText?: string;
}

/**
 * Searchable dropdown component built on MUI Autocomplete.
 * Used for vendor picker, project picker, and other searchable selections.
 */
export const SearchableSelect = <T,>({
  options,
  value,
  onChange,
  getOptionLabel,
  label,
  placeholder,
  loading = false,
  disabled = false,
  required = false,
  noOptionsText = 'No options',
}: SearchableSelectProps<T>) => {
  return (
    <Autocomplete
      options={options}
      value={value}
      onChange={(_event, newValue) => onChange(newValue)}
      getOptionLabel={getOptionLabel}
      loading={loading}
      disabled={disabled}
      noOptionsText={noOptionsText}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      isOptionEqualToValue={(option, value) => {
        // Default equality check - override if T has an id field
        return option === value;
      }}
    />
  );
};
