import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Download, FileText, Heart, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import '../styles/AdicionarPet.css'; 

interface RelatorioPetModalProps {
    isOpen: boolean;
    onClose: () => void;
    tutorId: number | null;
}

const getBase64ImageFromUrl = (imageUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; 
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/jpeg"));
            } else {
                resolve(null);
            }
        };
        img.onerror = (err) => {
            console.error("Erro ao carregar imagem para o PDF", err);
            resolve(null); 
        };
        img.src = imageUrl;
    });
};

export function RelatorioPetModal({ isOpen, onClose, tutorId }: RelatorioPetModalProps) {
    const [pets, setPets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [generatingPetId, setGeneratingPetId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen && tutorId) {
            setLoading(true);
            axios.get(`http://localhost:5000/api/tutores/${tutorId}/tutores-e-pets`)
                .then(res => {
                    setPets(res.data.pets || []);
                })
                .catch(err => console.error("Erro ao buscar pets:", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, tutorId]);

    const formatarData = (dataStr: string) => {
        if (!dataStr) return 'N/A';
        try {
            return new Date(dataStr).toLocaleDateString('pt-BR');
        } catch {
            return dataStr;
        }
    };

    const gerarRelatorioPDF = async (pet: any) => {
        setGeneratingPetId(pet.id_pet);
        try {
            const [vacinasRes, produtosRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/vacinas`).catch(() => ({ data: [] })),
                axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/produtos`).catch(() => ({ data: [] }))
            ]);

            const vacinas = vacinasRes.data || [];
            const produtos = produtosRes.data || [];

            const doc = new jsPDF();
            
            let currentY = 20;
            
            if (pet.foto_perfil) {
                const fotoUrl = `http://localhost:5000/api/uploads/${pet.foto_perfil}`;
                const base64Img = await getBase64ImageFromUrl(fotoUrl);
                
                if (base64Img) {
                    doc.addImage(base64Img, 'JPEG', 155, 12, 40, 40); 
                }
            }

            doc.setFontSize(22);
            doc.setTextColor(66, 0, 110); 
            doc.text(`Ficha de Cuidados: ${pet.nome_pet}`, 14, currentY);
            currentY += 10;

            doc.setFontSize(12);
            doc.setTextColor(50, 50, 50);
            doc.text(`Espécie: ${pet.especie || 'N/A'} | Raça: ${pet.raca || 'N/A'}`, 14, currentY);
            currentY += 8;
            doc.text(`Idade: ${pet.idade || 'N/A'} anos | Peso: ${pet.peso || 'N/A'} kg`, 14, currentY);
            currentY += 8;
            doc.text(`Gênero: ${pet.genero || 'N/A'} | Castrado: ${pet.castrado ? 'Sim' : 'Não'}`, 14, currentY);
            
            currentY = Math.max(currentY + 15, 60); 

            const isAlimento = (p: any) => {
                const cat = (p.categoria || '').toLowerCase();
                const nome = (p.nome_produto || '').toLowerCase();
                return cat.includes('aliment') || cat.includes('raç') || cat.includes('racao') || nome.includes('raç') || nome.includes('racao');
            };

            const isRemedio = (p: any) => {
                const cat = (p.categoria || '').toLowerCase();
                const nome = (p.nome_produto || '').toLowerCase();
                return cat.includes('medicament') || cat.includes('remédio') || cat.includes('remedio') || nome.includes('bravecto') || nome.includes('simparic');
            };

            const alimentos = produtos.filter((p: any) => isAlimento(p));

            if (alimentos.length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(0, 0, 0);
                doc.text("Alimentação (Ração e Outros)", 14, currentY);
                
                const alimentosData = alimentos.map((p: any) => {
                    let quantidadeDiaria = Number(p.consumo_medio) || 0;
                    if (p.consumo_periodo === 'semana') quantidadeDiaria = quantidadeDiaria / 7;
                    if (p.consumo_periodo === 'mes' || p.consumo_periodo === 'mês') quantidadeDiaria = quantidadeDiaria / 30;
                    
                    const qtdeFormatada = quantidadeDiaria % 1 === 0 ? quantidadeDiaria : quantidadeDiaria.toFixed(1);
                    
                    return [
                        p.nome_produto,
                        `${qtdeFormatada}g por dia`
                    ];
                });

                autoTable(doc, {
                    startY: currentY + 5,
                    head: [['Alimento / Ração', 'Quantidade Diária']],
                    body: alimentosData,
                    headStyles: { fillColor: [245, 158, 11] }, 
                    theme: 'grid'
                });
                currentY = (doc as any).lastAutoTable.finalY + 15;
            }

            const remedios = produtos
                .filter((p: any) => isRemedio(p))
                .filter((p: any) => (p.consumo_periodo || '').toLowerCase() !== 'ano'); 

            if (remedios.length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(0, 0, 0);
                doc.text("Medicamentos e Uso Contínuo", 14, currentY);

                const remediosData = remedios.map((p: any) => {
                    let freqOriginal = (p.consumo_periodo || '').toLowerCase();
                    let frequenciaFormatada = 'N/A';
                    
                    if (freqOriginal === 'dia') frequenciaFormatada = 'Diário';
                    else if (freqOriginal === 'semana') frequenciaFormatada = 'Semanal';
                    else if (freqOriginal === 'mes' || freqOriginal === 'mês') frequenciaFormatada = 'Mensal';
                    
                    return [
                        p.nome_produto,
                        frequenciaFormatada,
                        `${p.consumo_medio}`
                    ];
                });

                autoTable(doc, {
                    startY: currentY + 5,
                    head: [['Remédio', 'Frequência', 'Dosagem (por período)']],
                    body: remediosData,
                    headStyles: { fillColor: [239, 68, 68] },
                    theme: 'grid'
                });
                currentY = (doc as any).lastAutoTable.finalY + 15;
            }

            if (vacinas.length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(0, 0, 0);
                doc.text("Cartão de Vacinação", 14, currentY);

                const vacinasData = vacinas.map((v: any) => [
                    v.nome_vacina,
                    formatarData(v.data_vacinacao),
                    formatarData(v.proxima_dose)
                ]);

                autoTable(doc, {
                    startY: currentY + 5,
                    head: [['Vacina', 'Última Aplicação', 'Próxima Dose']],
                    body: vacinasData,
                    headStyles: { fillColor: [59, 130, 246] },
                });
                currentY = (doc as any).lastAutoTable.finalY + 15;
            }

            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text(`Documento gerado pelo sistema PetCare em ${new Date().toLocaleDateString('pt-BR')}`, 14, pageHeight - 10);

            doc.save(`Ficha_Cuidados_${pet.nome_pet.replace(/\s+/g, '_')}.pdf`);

            Swal.fire({
                title: 'Sucesso!',
                text: 'O PDF do relatório foi baixado com sucesso.',
                icon: 'success',
                confirmButtonColor: '#b942f4'
            });

            onClose(); 

        } catch (error) {
            console.error("Erro ao gerar relatório:", error);
            Swal.fire('Erro', 'Ocorreu um problema ao montar o PDF.', 'error');
        } finally {
            setGeneratingPetId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className='form' onClick={onClose}>
            <div className='form-content' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className='form-header'>
                    <h3><FileText size={20}/> Baixar Relatório do Pet</h3>
                    <button onClick={onClose} className='form-close-btn'><X size={22}/></button>
                </div>

                <div className='form-body'>
                    <p style={{ marginBottom: '20px', color: '#555', fontSize: '14px' }}>
                        Selecione o pet abaixo para gerar um PDF com as informações de alimentação, medicamentos e vacinas. (Ideal para compartilhar com hoteizinhos e cuidadores).
                    </p>

                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                            <Loader2 size={30} className="spinner" />
                        </div>
                    ) : pets.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {pets.map(pet => (
                                <div 
                                    key={pet.id_pet} 
                                    style={{ 
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                        padding: '12px 16px', border: '1px solid #eee', borderRadius: '8px',
                                        backgroundColor: '#fafafa'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                            {pet.foto_perfil ? (
                                                <img src={`http://localhost:5000/api/uploads/${pet.foto_perfil}`} alt={pet.nome_pet} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <Heart size={20} color="#999" />
                                            )}
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 'bold', color: '#333' }}>{pet.nome_pet}</p>
                                            <small style={{ color: '#777' }}>{pet.especie} • {pet.raca}</small>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => gerarRelatorioPDF(pet)}
                                        disabled={generatingPetId === pet.id_pet}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 12px', backgroundColor: '#b942f4', color: 'white',
                                            border: 'none', borderRadius: '6px', cursor: generatingPetId ? 'not-allowed' : 'pointer',
                                            fontWeight: 'bold', fontSize: '13px'
                                        }}
                                    >
                                        {generatingPetId === pet.id_pet ? <Loader2 size={16} className="spinner" /> : <Download size={16} />}
                                        Baixar PDF
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ textAlign: 'center', color: '#888' }}>Nenhum pet cadastrado.</p>
                    )}
                </div>
            </div>
        </div>
    );
}