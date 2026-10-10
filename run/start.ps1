# Copyright 2026 Prism AI Labs.
# SPDX-License-Identifier: Apache-2.0
<#
.SYNOPSIS
    PrismSpace Developer OS - Unified Fullstack Runner Alias
#>
$RunScript = Join-Path $PSScriptRoot "run.ps1"
& $RunScript @args
