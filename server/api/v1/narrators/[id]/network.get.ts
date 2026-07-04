import { eq, sql } from 'drizzle-orm';
import { db } from '../../../../utils/db';
import { Narrators } from '../../../../database/schema';

interface NetworkNode {
  id: string;
  name: string;
  type: 'central' | 'neighbor';
  reliability: string;
}

interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  type: 'transmitted_to';
}

interface DBConnectionRow {
  other_id: number;
  other_name: string | null;
  other_name_ar: string;
  other_reliability: string | null;
  rel_pos: number;
  weight: string;
}

export default defineEventHandler(async (event) => {
  const routerParams = event.context.params;
  const idStr = routerParams?.id;

  if (!idStr) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing narrator ID parameter.'
    });
  }

  const narratorId = parseInt(idStr, 10);
  if (isNaN(narratorId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Narrator ID must be a valid number.'
    });
  }

  const query = getQuery(event);
  const minWeight = query.min_weight ? parseInt(query.min_weight as string, 10) : 1;

  try {
    // 1. Fetch central narrator
    const centralResults = await db
      .select({
        standardnameen: Narrators.standardnameen,
        standardnamear: Narrators.standardnamear,
        reliability: Narrators.reliability
      })
      .from(Narrators)
      .where(eq(Narrators.narratorid, narratorId))
      .limit(1);

    const central = centralResults[0];
    if (!central) {
      throw createError({
        statusCode: 404,
        statusMessage: `Narrator with ID ${narratorId} not found.`
      });
    }

    // 2. Fetch connection weights
    // rel_pos = 1 means other_id is teacher (teacher -> central)
    // rel_pos = -1 means other_id is student (central -> other_id)
    const connections = await db.execute(sql`
      SELECT 
        hn2.narratorid as other_id, 
        n.standardnameen as other_name,
        n.standardnamear as other_name_ar,
        n.reliability as other_reliability,
        (hn2.narratorposition - hn1.narratorposition) as rel_pos,
        COUNT(hn1.hadithid) as weight
      FROM hadithnarrators hn1
      JOIN hadithnarrators hn2 ON hn1.hadithid = hn2.hadithid
      JOIN narrators n ON hn2.narratorid = n.narratorid
      WHERE hn1.narratorid = ${narratorId} 
        AND ABS(hn2.narratorposition - hn1.narratorposition) = 1
      GROUP BY hn2.narratorid, n.standardnameen, n.standardnamear, n.reliability, rel_pos
      HAVING COUNT(hn1.hadithid) >= ${minWeight}
    `);

    const rows = connections as unknown as DBConnectionRow[];

    // 3. Construct nodes and edges arrays compatible with Cytoscape.js
    const nodesMap = new Map<string, NetworkNode>();
    const edges: NetworkEdge[] = [];

    // Add central node
    nodesMap.set(String(narratorId), {
      id: String(narratorId),
      name: central.standardnameen || central.standardnamear,
      type: 'central',
      reliability: central.reliability || 'Unknown'
    });

    for (const r of rows) {
      const otherIdStr = String(r.other_id);
      
      // Add neighbor node if not already present
      if (!nodesMap.has(otherIdStr)) {
        nodesMap.set(otherIdStr, {
          id: otherIdStr,
          name: r.other_name || r.other_name_ar,
          type: 'neighbor',
          reliability: r.other_reliability || 'Unknown'
        });
      }

      // Add edge
      // If rel_pos is 1, other_id is teacher (source) -> central is student (target)
      // If rel_pos is -1, central is teacher (source) -> other_id is student (target)
      if (r.rel_pos === 1) {
        edges.push({
          source: otherIdStr,
          target: String(narratorId),
          weight: parseInt(r.weight, 10),
          type: 'transmitted_to'
        });
      } else if (r.rel_pos === -1) {
        edges.push({
          source: String(narratorId),
          target: otherIdStr,
          weight: parseInt(r.weight, 10),
          type: 'transmitted_to'
        });
      }
    }

    return {
      nodes: Array.from(nodesMap.values()),
      edges
    };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw createError({
      statusCode: 500,
      statusMessage: `Database error: ${message}`
    });
  }
});
