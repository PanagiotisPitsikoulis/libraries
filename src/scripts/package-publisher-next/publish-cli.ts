#!/usr/bin/env node
import { handleError } from "../utils";
import { publish } from "./publish";

publish().catch((error) => {
	handleError(error, "Package publishing");
});
