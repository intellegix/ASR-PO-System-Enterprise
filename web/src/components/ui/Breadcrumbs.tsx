'use client';

import Link from 'next/link';
import { Breadcrumbs as MuiBreadcrumbs, Typography, Box } from '@mui/material';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <Box component="nav" aria-label="Breadcrumb" sx={{ mb: 2 }}>
      <MuiBreadcrumbs separator="›" sx={{ fontSize: '0.875rem' }}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return isLast || !item.href ? (
            <Typography
              key={index}
              sx={{
                color: 'primary.main',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
              aria-current={isLast ? 'page' : undefined}
            >
              {item.label}
            </Typography>
          ) : (
            <Link key={index} href={item.href} passHref legacyBehavior>
              <Typography
                component="a"
                sx={{
                  color: 'text.secondary',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  '&:hover': {
                    color: 'text.primary',
                  },
                  transition: 'color 0.2s',
                }}
              >
                {item.label}
              </Typography>
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
}
