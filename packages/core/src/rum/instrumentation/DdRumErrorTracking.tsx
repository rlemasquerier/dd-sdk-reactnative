/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ErrorHandlerCallback } from 'react-native';

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../SdkVerbosity';
import {
    getErrorMessage,
    getErrorStackTrace,
    EMPTY_STACK_TRACE
} from '../../errorUtils';
import { DdRum } from '../../foundation';
import { ErrorSource } from '../../types';

/**
 * Provides RUM auto-instrumentation feature to track errors as RUM events.
 */
export class DdRumErrorTracking {
    private static isTracking = false;

    private static isInDefaultErrorHandler = false;

    // eslint-disable-next-line
    private static defaultErrorHandler: ErrorHandlerCallback = (_error: any, _isFatal?: boolean) => { }

    // eslint-disable-next-line
    private static defaultConsoleError = (..._params: unknown[]) => { }

    /**
     * Starts tracking errors and sends a RUM Error event every time an error is detected.
     */
    static startTracking(): void {
        // extra safety to avoid wrapping the Error handler twice
        if (DdRumErrorTracking.isTracking) {
            InternalLog.log(
                'Datadog SDK is already tracking errors',
                SdkVerbosity.WARN
            );
            return;
        }

        if (ErrorUtils) {
            DdRumErrorTracking.defaultErrorHandler = ErrorUtils.getGlobalHandler();
            DdRumErrorTracking.defaultConsoleError = console.error;

            ErrorUtils.setGlobalHandler(DdRumErrorTracking.onGlobalError);
            console.error = DdRumErrorTracking.onConsoleError;

            DdRumErrorTracking.isTracking = true;
            InternalLog.log(
                'Datadog SDK is tracking errors',
                SdkVerbosity.INFO
            );
        } else {
            InternalLog.log(
                'Datadog SDK cannot track errors, ErrorUtils is not defined',
                SdkVerbosity.ERROR
            );
        }
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    static onGlobalError(error: any, isFatal?: boolean): void {
        const message = getErrorMessage(error);
        const stacktrace = getErrorStackTrace(error);
        DdRum.addError(message, ErrorSource.SOURCE, stacktrace, {
            '_dd.error.is_crash': isFatal,
            '_dd.error.raw': error
        }).then(() => {
            DdRumErrorTracking.isInDefaultErrorHandler = true;
            try {
                DdRumErrorTracking.defaultErrorHandler(error, isFatal);
            } finally {
                DdRumErrorTracking.isInDefaultErrorHandler = false;
            }
        });
    }

    static onConsoleError(...params: unknown[]): void {
        if (DdRumErrorTracking.isInDefaultErrorHandler) {
            return;
        }

        let stack: string = EMPTY_STACK_TRACE;
        for (let i = 0; i < params.length; i += 1) {
            const param = params[i];
            const paramStack = getErrorStackTrace(param);
            if (paramStack !== EMPTY_STACK_TRACE) {
                stack = paramStack;
                break;
            }
        }

        const message = params
            .map(param => {
                if (typeof param === 'string') {
                    return param;
                } else {
                    return getErrorMessage(param);
                }
            })
            .join(' ');

        DdRum.addError(message, ErrorSource.CONSOLE, stack).then(() => {
            DdRumErrorTracking.defaultConsoleError.apply(console, params);
        });
    }
}
