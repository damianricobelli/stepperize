import handler from "@tanstack/react-start/server-entry";
import { FastResponse } from "srvx";

globalThis.Response = FastResponse;

export default {
	async fetch(req: Request): Promise<Response> {
		return await handler.fetch(req);
	},
};
