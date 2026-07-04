import { eq } from 'drizzle-orm';
import type { Database } from './db';
import { Hadiths, HadithNarrators, Narrators } from '../database/schema';

export interface NarratorChainNode {
  narratorid: number;
  standardnamear: string;
  standardnameen: string | null;
  thabaqat: number | null;
  birthhijri: number | null;
  deathhijri: number | null;
  reliability: string | null;
  narratorposition: number;
}

export interface IntegrityGap {
  type: 'generational_inversion' | 'generational_gap' | 'chronological_impossible' | 'youth_warning';
  description: string;
  student: string;
  student_id: number;
  teacher: string;
  teacher_id: number;
}

export interface HadithIntegrityResult {
  hadithid: number;
  is_continuous: boolean;
  gaps: IntegrityGap[];
  analysis: string;
  chain: NarratorChainNode[];
}

export async function checkHadithIntegrityLogic(
  db: Database,
  hadithId: number
): Promise<HadithIntegrityResult> {
  // 1. Fetch the hadith to ensure it exists
  const hadithExists = await db
    .select({ hadithid: Hadiths.hadithid })
    .from(Hadiths)
    .where(eq(Hadiths.hadithid, hadithId))
    .limit(1);

  if (hadithExists.length === 0) {
    throw new Error(`Hadith with ID ${hadithId} not found.`);
  }

  // 2. Fetch the narrator transmission chain
  const chainData = await db
    .select({
      narratorid: Narrators.narratorid,
      standardnamear: Narrators.standardnamear,
      standardnameen: Narrators.standardnameen,
      thabaqat: Narrators.thabaqat,
      birthhijri: Narrators.birthhijri,
      deathhijri: Narrators.deathhijri,
      reliability: Narrators.reliability,
      narratorposition: HadithNarrators.narratorposition
    })
    .from(HadithNarrators)
    .innerJoin(Narrators, eq(HadithNarrators.narratorid, Narrators.narratorid))
    .where(eq(HadithNarrators.hadithid, hadithId))
    .orderBy(HadithNarrators.narratorposition);

  const chain: NarratorChainNode[] = chainData;
  const gaps: IntegrityGap[] = [];

  // 3. Analyze connections between adjacent narrators
  // Transmission flows from position N (earlier) to position N-1 (later), down to position 1.
  // So: chain[i] is the student, chain[i+1] is the teacher.
  for (let i = 0; i < chain.length - 1; i++) {
    const student = chain[i];
    const teacher = chain[i + 1];

    if (!student || !teacher) continue;

    // Check generational (thabaqat) difference
    if (student.thabaqat !== null && teacher.thabaqat !== null) {
      const diff = student.thabaqat - teacher.thabaqat;

      if (diff < 0) {
        gaps.push({
          type: 'generational_inversion',
          description: `Anomali silsilah: Murid (${student.standardnameen || student.standardnamear}, Thabaqat ${student.thabaqat}) memiliki thabaqat lebih rendah dari Guru (${teacher.standardnameen || teacher.standardnamear}, Thabaqat ${teacher.thabaqat}).`,
          student: student.standardnameen || student.standardnamear,
          student_id: student.narratorid,
          teacher: teacher.standardnameen || teacher.standardnamear,
          teacher_id: teacher.narratorid
        });
      } else if (diff >= 2) {
        gaps.push({
          type: 'generational_gap',
          description: `Kesenangan generasi (Kemungkinan Mursal): Ada jarak ${diff} generasi antara Murid (${student.standardnameen || student.standardnamear}) dan Guru (${teacher.standardnameen || teacher.standardnamear}).`,
          student: student.standardnameen || student.standardnamear,
          student_id: student.narratorid,
          teacher: teacher.standardnameen || teacher.standardnamear,
          teacher_id: teacher.narratorid
        });
      }
    }

    // Check chronological lifespans
    if (teacher.deathhijri !== null && student.birthhijri !== null) {
      if (teacher.deathhijri < student.birthhijri) {
        gaps.push({
          type: 'chronological_impossible',
          description: `Jeda kronologis mutlak: Guru (${teacher.standardnameen || teacher.standardnamear}) wafat pada tahun ${teacher.deathhijri} H, sebelum Murid (${student.standardnameen || student.standardnamear}) lahir pada tahun ${student.birthhijri} H.`,
          student: student.standardnameen || student.standardnamear,
          student_id: student.narratorid,
          teacher: teacher.standardnameen || teacher.standardnamear,
          teacher_id: teacher.narratorid
        });
      } else {
        const ageAtTeacherDeath = teacher.deathhijri - student.birthhijri;
        if (ageAtTeacherDeath < 7) {
          gaps.push({
            type: 'youth_warning',
            description: `Peringatan usia periwayatan: Murid (${student.standardnameen || student.standardnamear}) baru berusia ${ageAtTeacherDeath} tahun ketika Guru (${teacher.standardnameen || teacher.standardnamear}) wafat pada tahun ${teacher.deathhijri} H.`,
            student: student.standardnameen || student.standardnamear,
            student_id: student.narratorid,
            teacher: teacher.standardnameen || teacher.standardnamear,
            teacher_id: teacher.narratorid
          });
        }
      }
    }

    if (student.deathhijri !== null && teacher.birthhijri !== null) {
      if (student.deathhijri < teacher.birthhijri) {
        gaps.push({
          type: 'chronological_impossible',
          description: `Jeda kronologis mutlak: Murid (${student.standardnameen || student.standardnamear}) wafat pada tahun ${student.deathhijri} H, sebelum Guru (${teacher.standardnameen || teacher.standardnamear}) lahir pada tahun ${teacher.birthhijri} H.`,
          student: student.standardnameen || student.standardnamear,
          student_id: student.narratorid,
          teacher: teacher.standardnameen || teacher.standardnamear,
          teacher_id: teacher.narratorid
        });
      }
    }
  }

  // 4. Determine if the chain is fully continuous
  // High-severity gaps (chronological impossible and generational inversion) break continuity.
  // Generational gap (Mursal) also technically means not strictly continuous.
  const hasCriticalGap = gaps.some(g => g.type === 'chronological_impossible' || g.type === 'generational_inversion' || g.type === 'generational_gap');
  const is_continuous = chain.length > 0 && !hasCriticalGap;

  // 5. Generate descriptive analysis
  let analysis = '';
  if (chain.length === 0) {
    analysis = 'Sanad tidak terdaftar atau tidak memiliki perawi yang tercatat di database.';
  } else if (chain.length === 1 && chain[0]) {
    analysis = `Sanad hanya memiliki satu perawi teridentifikasi: ${chain[0].standardnameen || chain[0].standardnamear}. Analisis silsilah transmisi lengkap memerlukan minimal dua perawi.`;
  } else {
    const firstNode = chain[0];
    const lastNode = chain[chain.length - 1];
    if (firstNode && lastNode) {
      analysis = `Silsilah sanad terdiri dari ${chain.length} perawi, mengalir dari ${lastNode.standardnameen} ke compiler ${firstNode.standardnameen}. `;
    } else {
      analysis = `Silsilah sanad terdiri dari ${chain.length} perawi. `;
    }
    if (gaps.length === 0) {
      analysis += 'Hasil analisis menunjukkan bahwa sanad ini bersambung (muttashil) tanpa ada jeda generasi maupun kontradiksi kronologis antara murid dan guru.';
    } else {
      analysis += `Ditemukan ${gaps.length} anomali atau peringatan dalam rantai transmisi ini: `;
      analysis += gaps.map(g => g.description).join(' ');
    }
  }

  return {
    hadithid: hadithId,
    is_continuous,
    gaps,
    analysis,
    chain
  };
}
