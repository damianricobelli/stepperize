"use client";

import { cva } from "class-variance-authority";

export const DemoViewer = ({ src, className }: { src: string; className?: string }) => {
	return <iframe src={src} title="Demo Viewer" className={classForDemoViewer({ className })} />;
};

const classForDemoViewer = cva("w-full h-[600px] border rounded-md");
