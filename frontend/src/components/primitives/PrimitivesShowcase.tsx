import React from 'react';
import {
  StampBadge,
  HairlineRule,
  LedgerRow,
  HashBlock,
  SectionHeading,
  LedgerEmptyState,
  LedgerSkeleton,
} from './index';

export const PrimitivesShowcase: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 paper-grain bg-ledger-ground text-ledger-ink border border-ledger-hairline rounded-xs my-8 shadow-ledger-xs">
      <div className="border-b border-ledger-hairline pb-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-ledger-crimson font-semibold">
          SYSTEM SPECIFICATION § 01
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ledger-ink mt-1">
          The Editorial Ledger Primitives
        </h1>
        <p className="text-xs text-ledger-muted font-sans mt-1">
          Visual index of the design tokens, hairline structures, stamp seals, and cryptographic formatting blocks.
        </p>
      </div>

      {/* 1. Stamp Badges */}
      <div>
        <SectionHeading folio="PRIMITIVE § 01" title="Wax-Seal & Rubber Stamp Badges" size="sm" />
        <div className="flex flex-wrap gap-3 items-center">
          <StampBadge label="CERTIFIED VALID" variant="certified" />
          <StampBadge label="AWAITING GATE" variant="pending" />
          <StampBadge label="ORDER REJECTED" variant="rejected" />
          <StampBadge label="OFFICIAL SEAL" variant="crimson" prefix="§" />
          <StampBadge label="WH-NORTH-01" variant="neutral" />
          <StampBadge label="SM-214" variant="neutral" size="sm" />
        </div>
      </div>

      <HairlineRule label="TYPOGRAPHIC SEPARATION" ornament />

      {/* 2. Ledger Rows with Dotted Leaders */}
      <div>
        <SectionHeading folio="PRIMITIVE § 02" title="Ledger Rows with Dotted Leaders" size="sm" />
        <div className="bg-ledger-surface border border-ledger-hairline p-4 rounded-xs space-y-1">
          <LedgerRow
            label="SKU-CHAI-250g (Premium Assam Dust)"
            sublabel="MOQ 10"
            value="₹ 12,450.00"
            subvalue="40 Units"
          />
          <LedgerRow
            label="SKU-ATTA-10kg (Chakki Fresh Whole Wheat)"
            sublabel="MOQ 20"
            value="₹ 38,200.00"
            subvalue="100 Units"
            highlight
          />
          <LedgerRow
            label="Central DC Allocation (WH-NORTH-01)"
            value="35 Units"
            subvalue="65% Hub Buffer"
          />
          <LedgerRow
            label="Stockout Gap Estimated Lost Sales"
            value="₹ 8,420.00 / day"
            subvalue="Critical"
          />
        </div>
      </div>

      <HairlineRule label="CRYPTOGRAPHIC AUDIT PROOFS" ornament />

      {/* 3. Hash Blocks */}
      <div>
        <SectionHeading folio="PRIMITIVE § 03" title="SHA-256 Monospace Hash Chunks" size="sm" />
        <div className="space-y-3">
          <div>
            <HashBlock
              hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              length="short"
              label="CHAIN HEAD"
            />
          </div>
          <div>
            <HashBlock
              hash="7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730"
              length="medium"
              label="ROOT BLOCK"
            />
          </div>
        </div>
      </div>

      <HairlineRule label="LOADING & EMPTY STATES" ornament />

      {/* 4. Skeleton & Empty States */}
      <div>
        <SectionHeading folio="PRIMITIVE § 04" title="Archival Skeleton & Empty Folios" size="sm" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-ledger-hairline bg-ledger-surface p-4 rounded-xs">
            <span className="text-[10px] font-mono text-ledger-faint uppercase block mb-2">Paper Shimmer Skeleton</span>
            <LedgerSkeleton lines={3} />
          </div>
          <div className="border border-ledger-hairline bg-ledger-surface p-4 rounded-xs">
            <span className="text-[10px] font-mono text-ledger-faint uppercase block mb-2">Docket Card Shimmer</span>
            <LedgerSkeleton type="card" />
          </div>
        </div>
        <LedgerEmptyState
          folio="FOLIO § ARCHIVE-ZERO"
          title="No Unrouted Purchase Requisitions"
          description="All inventory threshold signals have been certified and dispatched through the Temporal execution harness."
        />
      </div>
    </div>
  );
};
