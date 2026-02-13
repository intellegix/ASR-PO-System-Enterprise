'use client';

import { Box, Button, Typography, Chip } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import BusinessIcon from '@mui/icons-material/Business';
import BuildIcon from '@mui/icons-material/Build';

interface Division {
  id: string;
  division_code: string;
  division_name: string;
  cost_center_prefix: string;
}

interface DivisionPickerProps {
  divisions: Division[];
  selectedId: string | null;
  userDivisionId?: string | null;
  onSelect: (division: Division) => void;
}

const DIVISION_ICONS: Record<string, typeof HomeIcon> = {
  'CAPEX': HomeIcon,
  'Roofing': BusinessIcon,
  'Service Work': BuildIcon,
};

export default function DivisionPicker({ divisions, selectedId, userDivisionId, onSelect }: DivisionPickerProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
          Pick Division
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Which division is this purchase for?
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
        {divisions.map((div) => {
          const isSelected = selectedId === div.id;
          const isUserDivision = div.id === userDivisionId;
          const IconComponent = DIVISION_ICONS[div.division_name] || BusinessIcon;

          return (
            <Button
              key={div.id}
              onClick={() => onSelect(div)}
              variant={isSelected ? 'contained' : 'outlined'}
              color={isSelected ? 'warning' : 'inherit'}
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                borderRadius: 3,
                textAlign: 'left',
                justifyContent: 'flex-start',
                textTransform: 'none',
                borderWidth: 2,
                ...(isSelected ? {
                  borderColor: 'warning.main',
                  bgcolor: 'warning.lighter',
                  boxShadow: '0 0 0 2px rgba(255, 152, 0, 0.2)',
                  '&:hover': {
                    bgcolor: 'warning.light'
                  }
                } : {
                  borderColor: 'grey.300',
                  color: 'text.primary',
                  '&:hover': {
                    borderColor: 'warning.light',
                    bgcolor: 'warning.lighter'
                  }
                })
              }}
            >
              <Box
                sx={{
                  flexShrink: 0,
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: isSelected ? 'warning.main' : 'grey.100',
                  color: isSelected ? 'white' : 'text.secondary'
                }}
              >
                <IconComponent sx={{ width: 24, height: 24 }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {div.division_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {div.cost_center_prefix}
                </Typography>
              </Box>
              {isUserDivision && (
                <Chip
                  label="Your Division"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    height: 20,
                    fontSize: 10,
                    fontWeight: 500,
                    bgcolor: 'info.lighter',
                    color: 'info.dark'
                  }}
                />
              )}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
}
