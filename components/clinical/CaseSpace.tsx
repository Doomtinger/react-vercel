'use client';

import { useMemo, useState } from 'react';
import { CaseList } from './ui';
import Workbench from './Workbench';
import RecordClient from './RecordClient';
import { CASES, type CaseRecord, type ClinicalCase } from './data';

export default function CaseSpace() {
  const [cases, setCases] = useState<ClinicalCase[]>(() => JSON.parse(JSON.stringify(CASES)));
  const [caseId, setCaseId] = useState(cases[0].id);
  const [surface, setSurface] = useState<'workbench' | 'client'>('workbench');
  const [recordId, setRecordId] = useState<string | null>(null);

  const clinicalCase = useMemo(() => cases.find((c) => c.id === caseId) ?? cases[0], [cases, caseId]);

  const addRecord = (cid: string, record: CaseRecord) => {
    setCases((prev) =>
      prev.map((c) => (c.id === cid ? { ...c, records: [...c.records, record] } : c))
    );
    setRecordId(record.id);
  };

  const switchCase = (id: string) => {
    setCaseId(id);
    setRecordId(null);
    setSurface('workbench');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070B14] text-white">
      <CaseList cases={cases} activeId={caseId} onSelect={switchCase} />

      {surface === 'workbench' ? (
        <Workbench
          key={caseId}
          clinicalCase={clinicalCase}
          selectedId={recordId}
          onSelect={setRecordId}
          onAdd={addRecord}
          onSwitchSurface={setSurface}
        />
      ) : (
        <RecordClient clinicalCase={clinicalCase} onAdd={addRecord} onRecorded={(id) => { setRecordId(id); setSurface('workbench'); }} />
      )}
    </div>
  );
}
