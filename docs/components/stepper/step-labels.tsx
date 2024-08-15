export const StepLabels = ({
	title,
	description,
}: {
	title?: string;
	description?: string;
}) => {
	if (!title && !description) {
		return null;
	}

	return (
		<div className="flex flex-col">
			{title && <span className="text-sm">{title}</span>}
			{description && (
				<span className="text-xs text-gray-500">{description}</span>
			)}
		</div>
	);
};
