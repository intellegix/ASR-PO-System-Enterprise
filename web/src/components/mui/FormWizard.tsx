'use client';

import { Box, Stepper, Step, StepLabel, Button, Paper } from '@mui/material';

interface FormWizardProps {
  steps: string[];
  activeStep: number;
  children: React.ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
  nextLabel?: string;
  backLabel?: string;
  skipLabel?: string;
  nextDisabled?: boolean;
}

/**
 * Multi-step form wizard component with Material-UI Stepper.
 * Provides navigation controls and progress indication.
 */
export const FormWizard = ({
  steps,
  activeStep,
  children,
  onNext,
  onBack,
  onSkip,
  showSkip = false,
  nextLabel = 'Next',
  backLabel = 'Back',
  skipLabel = 'Skip',
  nextDisabled = false,
}: FormWizardProps) => {
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === steps.length - 1;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step content */}
      <Paper sx={{ p: 3, mb: 3 }}>{children}</Paper>

      {/* Navigation buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box>
          {!isFirstStep && (
            <Button onClick={onBack} disabled={!onBack}>
              {backLabel}
            </Button>
          )}
          {showSkip && onSkip && !isLastStep && (
            <Button onClick={onSkip} sx={{ ml: 1 }}>
              {skipLabel}
            </Button>
          )}
        </Box>

        <Box>
          {onNext && (
            <Button variant="contained" onClick={onNext} disabled={nextDisabled}>
              {isLastStep ? 'Finish' : nextLabel}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};
