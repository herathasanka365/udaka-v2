import { Button } from "./button"
import { ButtonProps } from "./button"
import { forwardRef } from "react"

export interface PrimaryButtonProps extends Omit<ButtonProps, 'variant'> {}

const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <Button
        variant="primary"
        className={className}
        ref={ref}
        {...props}
      />
    )
  }
)

PrimaryButton.displayName = "PrimaryButton"

export { PrimaryButton }