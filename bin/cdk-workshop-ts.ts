#!/usr/bin/env node
import cdk = require('@aws-cdk/core');
import { CdkWorkshopTsStack } from '../lib/cdk-workshop-ts-stack';

const app = new cdk.App();
new CdkWorkshopTsStack(app, 'CdkWorkshopTsStack');