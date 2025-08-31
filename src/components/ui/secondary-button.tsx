import { Button } from "./button"
import { ButtonProps } from "./button"
import { forwardRef } from "react"

export interface SecondaryButtonProps extends Omit<ButtonProps, 'variant'> {}

const SecondaryButton = forwardRef<HTMLButtonElement, SecondaryButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <Button
        variant="secondary-outline"
        className={className}
        ref={ref}
        {...props}
      />
    )
  }
)

SecondaryButton.displayName = "SecondaryButton"

export { SecondaryButton }