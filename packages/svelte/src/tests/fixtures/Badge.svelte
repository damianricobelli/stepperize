<script lang="ts">
import { Stepper } from "./flow";

const item = Stepper.useItem();
</script>

<span data-testid={`badge-${item.step.id}`}>{item.index + 1} {item.state} {item.disabled} {item.pending}</span>
