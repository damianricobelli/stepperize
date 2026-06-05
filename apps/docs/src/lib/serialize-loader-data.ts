export function serializeLoaderData<Data>(data: Data): Data {
	return JSON.parse(JSON.stringify(data)) as Data;
}
