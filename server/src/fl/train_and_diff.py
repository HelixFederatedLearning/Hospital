#!/usr/bin/env python3
# Minimal stub trainer for FL delta generation
# Produces a small "bb" (backbone) and "hd" (head) delta that Central accepts.

import argparse, os, sys
import torch

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--global", dest="global_path", required=False, help="path to current global .pth (optional)")
    p.add_argument("--images", nargs="*", default=[], help="training images (unused in stub)")
    p.add_argument("--labels", nargs="*", default=[], help="labels (unused in stub)")
    p.add_argument("--out", required=True, help="output delta .pt path")
    p.add_argument("--kind", default="hospital")
    args = p.parse_args()

    # Optional: read the global to seed shapes (not strictly needed in this stub)
    # If present and torch.load fails due to weights_only=True default in PT 2.6, force weights_only=False.
    if args.global_path and os.path.isfile(args.global_path):
        try:
            _ = torch.load(args.global_path, map_location="cpu", weights_only=False)
        except Exception as e:
            print(f"[trainer] warning: couldn't read global ({e}); continuing with stub shapes", file=sys.stderr)

    # ---- Produce a small, deterministic delta ----
    # You can replace these with real gradients from your model later.
    torch.manual_seed(42)
    bb = {"backbone.conv.weight": torch.randn(8, 3, 3, 3).float()}  # backbone example
    hd = {
        "classifier.weight": torch.randn(5, 8).float(),             # 5 classes, 8 features
        "classifier.bias": torch.randn(5).float()
    }

    out_dir = os.path.dirname(os.path.abspath(args.out))
    if out_dir and not os.path.isdir(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    torch.save({"bb": bb, "hd": hd}, args.out)
    print(f"[trainer] wrote delta to {args.out} (kind={args.kind}, images={len(args.images)})")

if __name__ == "__main__":
    main()
